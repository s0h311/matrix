import { writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import {
  type Commit,
  findOpenIssues,
  findLastCommits,
  type Issue,
  LAST_COMMITS_FILE_PATH,
  OPEN_ISSUES_FILE_PATH,
} from './issues.ts'
import { getConfig } from './config.ts'
import { runChecks, runCmd } from './checks.ts'

const config = getConfig()
const SRC_PROMPT_FILE_PATH = `${import.meta.dirname}/../prompt.md`
const TMP_PROMPT_FILE_PATH = '.matrix/prompt.md'

await main()

async function main() {
  if (!existsSync('.matrix')) {
    mkdirSync('.matrix')
  }

  copyFileSync(SRC_PROMPT_FILE_PATH, TMP_PROMPT_FILE_PATH)

  try {
    for (let i = 1; i <= config.maxIterations; i++) {
      console.info(`=====ITERATION ${i} / ${config.maxIterations}=====\n\n`)

      const { openIssues } = await fetchAndPersistOpenIssuesAndLastCommits()

      if (openIssues.length === 0) {
        console.info(`\n\n=====NO OPEN ISSUES FOUND=====`) // TODO improve this

        break
      }

      const result = await runIteration()

      if (result.includes('<promise>COMPLETE</promise>')) {
        console.info(`\n\n=====COMPLETED AFTER ${i} ITERATIONS=====`)
        break
      }

      if (!config.checks) {
        continue
      }

      if (config.checks.fmt) {
        await runCmd(config.checks.fmt)

        await runCmd('git add -A')
        await runCmd('git commit -m "fmt"')
      }

      const { lint, test } = await runChecks(config.checks)

      const additionalPrompts: string[] = ['Failed checks:']

      if (!lint) {
        additionalPrompts.push('- linter: use "pnpm lint"')
      }

      if (!test) {
        additionalPrompts.push('- tests: use "pnpm test"')
      }

      if (additionalPrompts.length > 1) {
        additionalPrompts.push(
          'Fix failing checks. When you validated that the problems are fixed, commit the changes.',
        )

        console.info('\n\n=====SOME CHECKS FAILED. FIXING NOW=====')

        await runAgentInSandbox(additionalPrompts.join('\n'))
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    rmSync(OPEN_ISSUES_FILE_PATH)
    rmSync(LAST_COMMITS_FILE_PATH)
    rmSync(TMP_PROMPT_FILE_PATH)
  }
}

async function runIteration() {
  return await runAgentInSandbox(`@${OPEN_ISSUES_FILE_PATH} @${LAST_COMMITS_FILE_PATH} @${TMP_PROMPT_FILE_PATH}`)
}

async function runAgentInSandbox(prompt: string): Promise<string> {
  const cmd = `docker sandbox run claude -- --permission-mode bypassPermissions -p "${prompt}"`

  return execSync(cmd, {
    encoding: 'utf-8',
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
