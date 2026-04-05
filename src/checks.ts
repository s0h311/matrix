import { execSync } from 'node:child_process'
import type { Checks } from './config.ts'

type CheckResult = {
  lint: boolean
  test: boolean
}

export async function runChecks(checks: Checks): Promise<CheckResult> {
  let lint = true
  let test = true

  if (checks.lint) {
    lint = await runCmd(checks.lint)
  }

  if (checks.test) {
    test = await runCmd(checks.test)
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
