import { readFileSync } from 'node:fs'

type MatrixConfig = {
  maxIterations: number
  github: {
    owner: string
    repo: string
  }
  agent: Agent
  checks?: Checks
  review?: boolean
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

const DEFAULT_AGENT_MODEL: Agent['model'] = 'opus'
const DEFAULT_AGENT_EFFORT: Agent['effort'] = 'high'

export function getConfig(): MatrixConfig {
  const contents = readFileSync(CONFIG_FILE_PATH, { encoding: 'utf-8' })

  const config: MatrixConfig = JSON.parse(contents)

  return {
    ...config,
    agent: {
      model: config.agent?.model ?? DEFAULT_AGENT_MODEL,
      effort: config.agent?.effort ?? DEFAULT_AGENT_EFFORT,
    },
  }
}
