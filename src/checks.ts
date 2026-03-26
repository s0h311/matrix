import { execSync } from 'node:child_process'
import type { Checks } from './config.ts'

type CheckResult = {
  fmt: boolean
  lint: boolean
  test: boolean
}

export async function runChecks(checks: Checks): Promise<CheckResult> {
  let fmt = true
  let lint = true
  let test = true

  if (checks.fmt) {
    fmt = await runCmd(checks.fmt)
  }

  if (checks.lint) {
    lint = await runCmd(checks.lint)
  }

  if (checks.test) {
    test = await runCmd(checks.test)
  }

  return {
    fmt,
    lint,
    test,
  }
}

async function runCmd(cmd: string): Promise<boolean> {
  try {
    execSync(cmd, {
      encoding: 'utf-8',
    })

    return true
  } catch {
    return false
  }
}
