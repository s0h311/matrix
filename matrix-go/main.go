package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "log"
  "os"
  "os/exec"
  "strings"

  _ "embed"
)

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

    result, err := runAgentInSandbox(fmt.Sprintf(
      "@%s @%s @%s", openIssuesPath, lastCommitsPath, tmpPromptPath,
    ))
    if err != nil {
      return err
    }

    if strings.Contains(result, "<promise>COMPLETE</promise>") {
      fmt.Printf("\n\n=====COMPLETED AFTER %d ITERATIONS=====\n", i)
      break
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
    if _, err := runAgentInSandbox(strings.Join(parts, "\n")); err != nil {
      return err
    }
  }
  return nil
}

func runAgentInSandbox(prompt string) (string, error) {
  cmd := exec.Command("docker", "sandbox", "run", "claude", "--",
    "--permission-mode", "bypassPermissions", "-p", prompt)
  var out bytes.Buffer
  cmd.Stdout = &out
  cmd.Stderr = os.Stderr
  if err := cmd.Run(); err != nil {
    return "", fmt.Errorf("agent: %w", err)
  }
  return out.String(), nil
}

func writeJSON(path string, v any) error {
  data, err := json.Marshal(v)
  if err != nil {
    return err
  }
  return os.WriteFile(path, data, 0o644)
}
