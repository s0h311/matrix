import { writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import {
  type Commit,
  findOpenIssues,
  findLastCommits,
  type Issue,
  LAST_COMMITS_FILE_PATH,
  OPEN_ISSUES_FILE_PATH,
} from './issues.ts'
import { getConfig } from './config.ts'
import { runLintAndTest, runCmd } from './checks.ts'
import { usageLimitReached } from './usage.ts'
import { sandboxExists, promptAgentInSandbox } from './sandbox.ts'
import consola from 'consola'

const config = getConfig()

const SRC_IMPLEMENT_PROMPT_FILE_PATH = `${import.meta.dirname}/../prompts/implement.md`
const TMP_IMPLEMENT_PROMPT_FILE_PATH = '.matrix/implement_prompt.md'

const SRC_REVIEW_PROMPT_FILE_PATH = `${import.meta.dirname}/../prompts/review.md`
const TMP_REVIEW_PROMPT_FILE_PATH = '.matrix/review_prompt.md'

export async function run(): Promise<void> {
  ensureMatrixDirExists()

  copyFileSync(SRC_IMPLEMENT_PROMPT_FILE_PATH, TMP_IMPLEMENT_PROMPT_FILE_PATH)

  if (config.review) {
    copyFileSync(SRC_REVIEW_PROMPT_FILE_PATH, TMP_REVIEW_PROMPT_FILE_PATH)
  }

  if (!sandboxExists()) {
    return
  }

  await runIterations()
}

async function runIterations(): Promise<void> {
  try {
    // IMPLEMENTATION PHASE
    for (let i = 1; i <= config.maxIterations; i++) {
      consola.info(`Iteration  ${i} / ${config.maxIterations}\n`)

      const { openIssues } = await fetchAndPersistOpenIssuesAndLastCommits()

      if (openIssues.length === 0) {
        consola.info(`No open issues found\n`)

        break
      }

      await runIteration()

      if (config.checks?.strategy === 'afterEach') {
        await runAllChecks()
      }
    }

    if (config.checks?.strategy === 'afterAll') {
      await runAllChecks()
    }

    // REVIEW PHASE
    if (config.review) {
      consola.info(`Starting review\n`)

      await runReview()
    }
  } catch (e) {
    const { limitReached, resetsAt } = await usageLimitReached()

    if (limitReached) {
      consola.info(`Claude Code usage limit reached\n`)
      // TODO use proper formatting
      consola.info(`Resets at ${resetsAt}\n`)
    }

    if (!limitReached) {
      consola.error(e)
    }
  } finally {
    rmSync(OPEN_ISSUES_FILE_PATH, { force: true })
    rmSync(LAST_COMMITS_FILE_PATH, { force: true })
    rmSync(TMP_IMPLEMENT_PROMPT_FILE_PATH, { force: true })
    rmSync(TMP_REVIEW_PROMPT_FILE_PATH, { force: true })
  }
}

async function runIteration(): Promise<void> {
  promptAgentInSandbox(`@${OPEN_ISSUES_FILE_PATH} @${LAST_COMMITS_FILE_PATH} @${TMP_IMPLEMENT_PROMPT_FILE_PATH}`, {
    agent: config.agent,
  })
}

async function runReview(): Promise<void> {
  promptAgentInSandbox(`@${TMP_REVIEW_PROMPT_FILE_PATH}`, {
    agent: config.agent,
  })
}

async function fetchAndPersistOpenIssuesAndLastCommits(): Promise<{
  openIssues: Issue[]
  lastCommits: Commit[]
}> {
  const openIssues = await findOpenIssues()
  const lastCommits = await findLastCommits()

  writeFileSync(OPEN_ISSUES_FILE_PATH, JSON.stringify(openIssues), { encoding: 'utf-8' })
  writeFileSync(LAST_COMMITS_FILE_PATH, JSON.stringify(lastCommits), { encoding: 'utf-8' })

  return {
    openIssues,
    lastCommits,
  }
}

async function runAllChecks(): Promise<void> {
  if (!config.checks) {
    return
  }

  if (config.checks.fmtCmd) {
    await runCmd(config.checks.fmtCmd)
    await runCmd('git add -A')

    const nothingStaged = await runCmd('git diff --cached --quiet')

    if (!nothingStaged) {
      await runCmd('git commit -m "fmt"')
    }
  }

  const { lint, test } = await runLintAndTest(config.checks)

  const additionalPrompts: string[] = ['Failed checks:']

  if (!lint) {
    additionalPrompts.push(`- linter: !"${config.checks.lintCmd}"`)
  }

  if (!test) {
    additionalPrompts.push(`- tests !"${config.checks.testCmd}"`)
  }

  if (additionalPrompts.length > 1) {
    additionalPrompts.push('Fix failing checks. When you validated that the problems are fixed, commit the changes.')

    consola.info('Some checks failed. Fixing now\n')

    promptAgentInSandbox(additionalPrompts.join('\n'), { agent: config.agent })
  }
}

function ensureMatrixDirExists(): void {
  if (!existsSync('.matrix')) {
    mkdirSync('.matrix')
  }
}
