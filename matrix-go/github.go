package main

import (
  "context"
  "fmt"
  "net/http"
  "os"
  "strings"

  "github.com/google/go-github/github"
)

const hitlOnlyLabel = "HITL only"

type Issue struct {
  ID              int64  `json:"id"` // TODO find out whether we really need this
  Number          int    `json:"number"`
  Title           string `json:"title"`
  BlockedByIssues []int  `json:"blockedByIssues"`
}

type Commit struct {
  SHA     string  `json:"sha"`
  Message string  `json:"message"`
  Date    *string `json:"date"`
}

type authTransport struct{ token string }

func (t *authTransport) RoundTrip(req *http.Request) (*http.Response, error) {
  req2 := req.Clone(req.Context())
  req2.Header.Set("Authorization", "Bearer "+t.token)
  return http.DefaultTransport.RoundTrip(req2)
}

func newGitHubClient() *github.Client {
  hc := &http.Client{Transport: &authTransport{token: os.Getenv("GH_TOKEN")}}
  return github.NewClient(hc)
}

type blockerItem struct {
  Number int `json:"number"`
}

func fetchBlockedBy(client *github.Client, ctx context.Context, owner, repo string, issueNumber int) ([]int, error) {
  url := fmt.Sprintf("repos/%s/%s/issues/%d/dependencies/blocked_by", owner, repo, issueNumber)
  req, err := client.NewRequest("GET", url, nil)
  if err != nil {
    return nil, err
  }
  var items []blockerItem
  if _, err = client.Do(ctx, req, &items); err != nil {
    return nil, err
  }
  numbers := make([]int, len(items))
  for i, b := range items {
    numbers[i] = b.Number
  }
  return numbers, nil
}

func findOpenIssues(owner, repo string) ([]Issue, error) {
  client := newGitHubClient()
  ctx := context.Background()

  opts := &github.IssueListByRepoOptions{
    State:       "open",
    ListOptions: github.ListOptions{PerPage: 100},
  }

  var result []Issue

  for {
    issues, resp, err := client.Issues.ListByRepo(ctx, owner, repo, opts)
    if err != nil {
      return nil, fmt.Errorf("list issues: %w", err)
    }

    for _, issue := range issues {
      if issue.PullRequestLinks != nil {
        continue
      }
      hasHitlLabel := false
      for _, l := range issue.Labels {
        if l.GetName() == hitlOnlyLabel {
          hasHitlLabel = true
          break
        }
      }
      if hasHitlLabel {
        continue
      }

      blockedByIssues, err := fetchBlockedBy(client, ctx, owner, repo, issue.GetNumber())
      if err != nil {
        return nil, fmt.Errorf("fetch blockers for issue %d: %w", issue.GetNumber(), err)
      }

      result = append(result, Issue{
        ID:              issue.GetID(),
        Number:          issue.GetNumber(),
        Title:           issue.GetTitle(),
        BlockedByIssues: blockedByIssues,
      })
    }

    if resp.NextPage == 0 {
      break
    }
    opts.Page = resp.NextPage
  }

  return result, nil
}

func findLastCommits(owner, repo string) ([]Commit, error) {
  client := newGitHubClient()
  ctx := context.Background()

  opts := &github.CommitsListOptions{
    ListOptions: github.ListOptions{PerPage: 50},
  }

  var result []Commit

  for {
    commits, resp, err := client.Repositories.ListCommits(ctx, owner, repo, opts)
    if err != nil {
      return nil, fmt.Errorf("list commits: %w", err)
    }

    for _, c := range commits {
      commitMessage := c.GetCommit().GetMessage()
      if !strings.Contains(strings.ToLower(commitMessage), "smith:") {
        continue
      }

      var date *string
      if t := c.GetCommit().GetCommitter().GetDate(); !t.IsZero() {
        s := t.Format("2006-01-02T15:04:05Z")
        date = &s
      }
      result = append(result, Commit{
        SHA:     c.GetSHA(),
        Message: commitMessage,
        Date:    date,
      })

      if len(result) == 10 {
        return result, nil
      }
    }

    if resp.NextPage == 0 {
      break
    }
    opts.Page = resp.NextPage
  }

  return result, nil
}

func fetchAndPersist(cfg *Config) ([]Issue, error) {
  issues, err := findOpenIssues(cfg.GitHub.Owner, cfg.GitHub.Repo)
  if err != nil {
    return nil, err
  }
  commits, err := findLastCommits(cfg.GitHub.Owner, cfg.GitHub.Repo)
  if err != nil {
    return nil, err
  }
  if err := writeJSON(openIssuesPath, issues); err != nil {
    return nil, err
  }
  if err := writeJSON(lastCommitsPath, commits); err != nil {
    return nil, err
  }
  return issues, nil
}
