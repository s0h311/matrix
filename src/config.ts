import { readFileSync } from 'node:fs'

type MatrixConfig = {
  maxIterations: number
  github: {
    owner: string
    repo: string
  }
  checks?: Checks
}

export type Checks = {
  fmt?: string
  lint?: string
  test?: string
}

const CONFIG_FILE_PATH = '.matrix/config.json'

export function getConfig(): MatrixConfig {
  const contents = readFileSync(CONFIG_FILE_PATH, { encoding: 'utf-8' })

  return JSON.parse(contents)
}
