import { execSync } from 'node:child_process'
import process from 'node:process'
import { logInfo } from './console.ts'
import { defined } from './utils.ts'
import type { Agent } from './config.ts'

const SANDBOX_NAME = `matrix-${defined(process.cwd().split('/').pop(), 'projectName')}`
const SANDBOX_IMAGE = 'docker.io/s0h311/matrix:latest'

function hasMatrixSandbox(): boolean {
  const result = execSync('sbx ls', {
    encoding: 'utf-8',
  })

  return result.includes(SANDBOX_NAME)
}

export function sandboxExists(): boolean {
  if (hasMatrixSandbox()) {
    return true
  }

  logInfo('CREATING SANDBOX')

  execSync(`sbx create --name ${SANDBOX_NAME} -t ${SANDBOX_IMAGE} claude .`, {
    encoding: 'utf-8',
  })

  logInfo(`IMPORTANT: run "sbx run --name ${SANDBOX_NAME}" and then run "/login" to login into claude`)

  return false
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function runInSandbox(cmd: string): string {
  return execSync(`sbx exec -w ${process.cwd()} ${SANDBOX_NAME} sh -c ${shellQuote(cmd)}`, {
    encoding: 'utf-8',
  })
}

export function promptAgentInSandbox(prompt: string, config: { agent: Agent }): string {
  const cmd = `sbx run --name ${SANDBOX_NAME} -- --model ${config.agent.model} --effort ${config.agent.effort} -p "${prompt}"`

  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: 'inherit',
  })
}

export function reinstallDependencies(): void {
  runInSandbox(`rm -fr node_modules && pnpm install`)
}
