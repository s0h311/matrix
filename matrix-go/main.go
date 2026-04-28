package main

import (
  "encoding/json"
  "fmt"
  "log"
  "os"
  "os/exec"
  "strings"

  _ "embed"
)

func init() {
  args := os.Args[1:]
  if len(args) >= 3 && args[0] == "issues" && args[1] == "dependencies" && args[2] == "add" {
    if len(args) < 4 {
      fmt.Fprintln(os.Stderr, `Usage: matrix issues dependencies add '{"<issue>": [<dep>, ...],...}'`)
      os.Exit(1)
    }
    raw := args[3]
    var depMap IssueDependencyMap
    if err := json.Unmarshal([]byte(raw), &depMap); err != nil {
      log.Fatalf("invalid JSON: %v", err)
    }
    cfg, err := getConfig()
    if err != nil {
      log.Fatalf("config: %v", err)
    }
    if err := addIssueDependencies(cfg.GitHub.Owner, cfg.GitHub.Repo, depMap); err != nil {
      log.Fatalf("add dependencies: %v", err)
    }
    os.Exit(0)
  }
}

//go:embed prompt.md
var promptContent []byte

const (
  openIssuesPath  = ".matrix/open_issues.json"
  lastCommitsPath = ".matrix/last_commits.json"
  tmpPromptPath   = ".matrix/prompt.md"
)

func main() {
  cfg, err := getConfig()
  if err != nil {
    log.Fatalf("config: %v", err)
  }

  if err := os.MkdirAll(".matrix", 0o755); err != nil {
    log.Fatalf("mkdir .matrix: %v", err)
  }

  if err := os.WriteFile(tmpPromptPath, promptContent, 0o644); err != nil {
    log.Fatalf("write prompt: %v", err)
  }

  defer func() {
    os.Remove(openIssuesPath)
    os.Remove(lastCommitsPath)
    os.Remove(tmpPromptPath)
  }()

  if err := run(cfg); err != nil {
    if usageLimitReached() {
      fmt.Println("\n\n=====CLAUDE CODE USAGE LIMIT HAS BEEN REACHED=====")
    } else {
      log.Printf("error: %v", err)
    }
    os.Exit(1)
  }
}

func run(cfg *Config) error {
  for i := 1; i <= cfg.MaxIterations; i++ {
    fmt.Printf("=====ITERATION %d / %d=====\n\n", i, cfg.MaxIterations)

    issues, err := fetchAndPersist(cfg)
    if err != nil {
      return err
    }

    if len(issues) == 0 {
      fmt.Println("\n\n=====NO OPEN ISSUES FOUND=====")
      break
    }

    if err := runAgentInSandbox(fmt.Sprintf(
      "@%s @%s @%s", openIssuesPath, lastCommitsPath, tmpPromptPath,
    )); err != nil {
      return err
    }

    if cfg.Checks != nil && !cfg.Checks.Defer {
      if err := runAllChecks(cfg); err != nil {
        return err
      }
    }
  }

  if cfg.Checks != nil && cfg.Checks.Defer {
    if err := runAllChecks(cfg); err != nil {
      return err
    }
  }

  return nil
}

func runAllChecks(cfg *Config) error {
  if cfg.Checks.FmtCmd != "" {
    runCmd(cfg.Checks.FmtCmd)
    runCmd("git add -A")
    // only commit if something was staged
    if !runCmd("git diff --cached --quiet") {
      runCmd(`git commit -m "fmt"`)
    }
  }

  lint, test := runChecks(cfg.Checks)

  if !lint || !test {
    var parts []string
    parts = append(parts, "Failed checks:")
    if !lint {
      parts = append(parts, fmt.Sprintf(`- linter: use "%s"`, cfg.Checks.LintCmd))
    }
    if !test {
      parts = append(parts, fmt.Sprintf(`- tests: use "%s"`, cfg.Checks.TestCmd))
    }
    parts = append(parts, "Fix failing checks. When you validated that the problems are fixed, commit the changes.")

    fmt.Println("\n\n=====SOME CHECKS FAILED. FIXING NOW=====")
    if err := runAgentInSandbox(strings.Join(parts, "\n")); err != nil {
      return err
    }
  }
  return nil
}

func runAgentInSandbox(prompt string) error {
  cmd := exec.Command("docker", "sandbox", "run", "claude", "--",
    "--permission-mode", "bypassPermissions", "-p", prompt)
  cmd.Stdout = os.Stdout
  cmd.Stderr = os.Stderr
  if err := cmd.Run(); err != nil {
    return fmt.Errorf("agent: %w", err)
  }
  return nil
}

func writeJSON(path string, v any) error {
  data, err := json.Marshal(v)
  if err != nil {
    return err
  }
  return os.WriteFile(path, data, 0o644)
}
