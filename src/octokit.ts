import { Octokit } from '@octokit/rest'

export function createOctokit(): Octokit {
  return new Octokit({
    auth: process.env.GH_TOKEN,
  })
}
