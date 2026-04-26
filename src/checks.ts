import { execSync } from 'node:child_process'
import type { Checks } from './config.ts'

type CheckResult = {
  lint: boolean
  test: boolean
}

export async function runLintAndTest(checks: Checks): Promise<CheckResult> {
  let lint = true
  let test = true

  if (checks.lintCmd) {
    lint = await runCmd(checks.lintCmd)
  }

  if (checks.testCmd) {
    test = await runCmd(checks.testCmd)
  }

  return {
    lint,
    test,
  }
}

export async function runCmd(cmd: string): Promise<boolean> {
  try {
    execSync(cmd, {
      encoding: 'utf-8',
    })

    return true
  } catch {
    return false
  }
}
