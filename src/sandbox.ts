import { execSync } from 'node:child_process'

const SANDBOX_NAME = 'matrix-sandbox'
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

  execSync(`sbx create --name ${SANDBOX_NAME} -t ${SANDBOX_IMAGE} claude .`, {
    encoding: 'utf-8',
  })

  console.info(`\n\nIMPORTANT: run "sbx run ${SANDBOX_IMAGE}" and then run "/login" to login into claude`)

  return false
}

export async function promptAgentInSandbox(prompt: string): Promise<string> {
  const cmd = `sbx run ${SANDBOX_NAME} -- -p "${prompt}"`

  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: 'inherit',
  })
}
