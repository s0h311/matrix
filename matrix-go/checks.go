package main

import "os/exec"

func runCmd(cmd string) bool {
	err := exec.Command("sh", "-c", cmd).Run()
	return err == nil
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
