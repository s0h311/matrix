import { getConfig } from './config.ts'
import { createOctokit } from './octokit.ts'

export const OPEN_ISSUES_FILE_PATH = '.matrix/open_issues.json'
export const LAST_COMMITS_FILE_PATH = '.matrix/last_commits.json'

const config = getConfig()
const OWNER = config.github.owner
const REPO = config.github.repo

const HITL_ONLY_LABEL = 'HITL only'

export async function findOpenIssues() {
  const octokit = createOctokit()

  const openIssues = await octokit.rest.issues.listForRepo({
    owner: OWNER,
    repo: REPO,
    state: 'open',
  })

  const result = []

  for (const issue of openIssues.data) {
    const isHitlOnly = issue.labels.some((label) => {
      if (typeof label === 'string') {
        return label === HITL_ONLY_LABEL
      }

      return label.name === HITL_ONLY_LABEL
    })

    if (issue.pull_request || isHitlOnly) {
      continue
    }

    const blockers = await octokit.issues.listDependenciesBlockedBy({
      owner: OWNER,
      repo: REPO,
      issue_number: issue.number,
    })

    const blockedByIssues = blockers.data.map(({ number }) => number)

    result.push({
      id: issue.id, // TODO find out whether we really need this
      number: issue.number,
      title: issue.title,
      blockedByIssues,
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

      if (commitMessage.includes('smith:')) {
        result.push({
          sha: commit.sha,
          message: commit.commit.message,
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

export async function addIssueDependencies(issueDependencyMap: IssueDependencyMap): Promise<void> {
  const octokit = createOctokit()

  const { data: issues } = await octokit.request('GET /repos/{owner}/{repo}/issues', {
    owner: OWNER,
    repo: REPO,
    headers: {
      'X-GitHub-Api-Version': '2026-03-10',
    },
  })

  for (const [dependedIssue, dependingIssues] of Object.entries(issueDependencyMap)) {
    const dependingIssueIds = dependingIssues
      .map((issueNumber) => {
        return issues.find(({ number }) => number === issueNumber)
      })
      .filter((issue) => issue !== undefined)
      .map((issue) => issue.id)

    for (const dependingIssueId of dependingIssueIds) {
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', {
        owner: OWNER,
        repo: REPO,
        issue_number: Number(dependedIssue),
        issue_id: dependingIssueId,
        headers: {
          'X-GitHub-Api-Version': '2026-03-10',
        },
      })
    }
  }
}

export type IssueDependencyMap = {
  [dependedIssueNumber: Issue['number']]: Issue['number'][]
}

export type Issue = Awaited<ReturnType<typeof findOpenIssues>>[0]
export type Commit = Awaited<ReturnType<typeof findLastCommits>>[0]

;`matrix issues dependencies add '{depended_issue_number_1: [depending_issue_1], depended_issue_number_2: [...]}'`
