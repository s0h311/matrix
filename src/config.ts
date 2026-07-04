import { readFileSync } from 'node:fs'

type MatrixConfig = {
  maxIterations: number
  github: {
    owner: string
    repo: string
  }
  checks?: Checks
  agent: Agent
}

export type Agent = {
  model: 'sonnet' | 'opus' | 'claude-fable-5'
  effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
}

export type Checks = {
  strategy?: 'afterEach' | 'afterAll'
  fmtCmd?: string
  lintCmd?: string
  testCmd?: string
}

const CONFIG_FILE_PATH = '.matrix/config.json'

export function getConfig(): MatrixConfig {
  const contents = readFileSync(CONFIG_FILE_PATH, { encoding: 'utf-8' })

  const config: MatrixConfig = JSON.parse(contents)

  return {
    ...config,
    agent: {
      model: config.agent?.model ?? 'opus',
      effort: config.agent?.effort ?? 'xhigh',
    },
  }
}
