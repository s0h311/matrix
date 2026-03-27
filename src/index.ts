import { writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { findOpenIssues, getLastCommits, LAST_COMMITS_FILE_PATH, OPEN_ISSUES_FILE_PATH } from './issues.ts'
import { getConfig } from './config.ts'
import { runChecks } from './checks.ts'

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
      console.log(`=====ITERATION ${i} / ${config.maxIterations}=====\n\n`)
      const result = await runIteration()

      if (result.includes('<promise>COMPLETE</promise>')) {
        console.log(`\n\n=====COMPLETED AFTER ${i} ITERATIONS=====`)
        break
      }

      if (!config.checks) {
        continue
      }

      const { fmt, lint, test } = await runChecks(config.checks)

      const additionalPrompts: string[] = ['Failed checks:']

      if (!fmt) {
        additionalPrompts.push('- formatter: use "pnpm fmt"')
      }

      if (!lint) {
        additionalPrompts.push('- linter: use "pnpm lint"')
      }

      if (!test) {
        additionalPrompts.push('- tests: use "pnpm test"')
      }

      if (additionalPrompts.length > 1) {
        additionalPrompts.push(
          'Fix failing checks. When you validated that the problems are fixed, commit to main branch.',
        )

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
  const openIssues = await findOpenIssues()
  const lastCommits = await getLastCommits()

  writeFileSync(OPEN_ISSUES_FILE_PATH, JSON.stringify(openIssues), { encoding: 'utf-8' })
  writeFileSync(LAST_COMMITS_FILE_PATH, JSON.stringify(lastCommits), { encoding: 'utf-8' })

  return await runAgentInSandbox(`@${OPEN_ISSUES_FILE_PATH} @${LAST_COMMITS_FILE_PATH} @${TMP_PROMPT_FILE_PATH}`)
}

async function runAgentInSandbox(prompt: string): Promise<string> {
  const cmd = `docker sandbox run claude -- --permission-mode bypassPermissions -p "${prompt}"`

  return execSync(cmd, {
    encoding: 'utf-8',
  })
}
