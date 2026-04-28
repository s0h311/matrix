package main

import (
	"os"
	"os/exec"
)

func runCmd(cmd string) bool {
	c := exec.Command("sh", "-c", cmd)
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr
	return c.Run() == nil
}

func runChecks(c *Checks) (lint, test bool) {
	lint = true
	test = true
	if c.LintCmd != "" {
		lint = runCmd(c.LintCmd)
	}
	if c.TestCmd != "" {
		test = runCmd(c.TestCmd)
	}
	return
}
