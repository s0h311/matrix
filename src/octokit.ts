import { Octokit } from '@octokit/rest'
import { setGlobalDispatcher, Agent } from 'undici'

setGlobalDispatcher(
  new Agent({
    keepAliveTimeout: 1,
    keepAliveMaxTimeout: 1,
  }),
)

export function createOctokit(): Octokit {
  return new Octokit({
    auth: process.env.GH_TOKEN,
  })
}
