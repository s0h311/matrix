package main

import "os/exec"

func runCmd(cmd string) bool {
	err := exec.Command("sh", "-c", cmd).Run()
	return err == nil
}

func runChecks(c *Checks) (lint, test bool) {
	lint = true
	test = true
	if c.Lint != "" {
		lint = runCmd(c.Lint)
	}
	if c.Test != "" {
		test = runCmd(c.Test)
	}
	return
}
