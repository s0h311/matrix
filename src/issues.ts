import { getConfig } from './config.ts'
import { createOctokit } from './octokit.ts'

export const OPEN_ISSUES_FILE_PATH = '.matrix/open_issues.json'
export const LAST_COMMITS_FILE_PATH = '.matrix/last_commits.json'

const config = getConfig()
const OWNER = config.github.owner
const REPO = config.github.repo

export async function findOpenIssues() {
  const octokit = createOctokit()

  const openIssues = await octokit.rest.issues.listForRepo({
    owner: OWNER,
    repo: REPO,
    state: 'open',
  })

  const result = []

  for (const issue of openIssues.data) {
    result.push({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      comments: issue.comments,
      pull_request: issue.pull_request,
      created_at: issue.created_at,
    })
  }

  return result
}

export async function findLastCommits() {
  const octokit = createOctokit()

  const result = []

  const commitIterator = octokit.paginate.iterator(octokit.rest.repos.listCommits, {
    owner: OWNER,
    repo: REPO,
    per_page: 50,
  })

  for await (const response of commitIterator) {
    for (const commit of response.data) {
      const commitMessage = commit.commit.message.toLowerCase()

      if (commitMessage.includes('ralph:') || commitMessage.includes('smith:')) {
        // TODO remove "ralph:" after a while
        result.push({
          sha: commit.sha,
          message: commit.commit.message.replaceAll('RALPH:', 'SMITH:'), // TODO remove replacement
          date: commit.commit.committer?.date ?? null,
        })
      }

      if (result.length === 10) {
        return result
      }
    }
  }

  return result
}

export type Issue = Awaited<ReturnType<typeof findOpenIssues>>[0]
export type Commit = Awaited<ReturnType<typeof findLastCommits>>[0]
