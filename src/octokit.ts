import { Octokit } from '@octokit/rest'
import { setGlobalDispatcher, Agent } from 'undici'

export function createOctokit(): Octokit {
  setGlobalDispatcher(
    new Agent({
      keepAliveTimeout: 1,
      keepAliveMaxTimeout: 1,
    }),
  )
  return new Octokit({
    auth: process.env.GH_TOKEN,
  })
}
