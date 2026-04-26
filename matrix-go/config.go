package main

import (
	"encoding/json"
	"os"
)

type Config struct {
	MaxIterations int `json:"maxIterations"`
	GitHub        struct {
		Owner string `json:"owner"`
		Repo  string `json:"repo"`
	} `json:"github"`
	Checks *Checks `json:"checks,omitempty"`
}

type Checks struct {
	Defer   bool   `json:"defer"`
	FmtCmd  string `json:"fmtCmd,omitempty"`
	LintCmd string `json:"lintCmd,omitempty"`
	TestCmd string `json:"testCmd,omitempty"`
}

func getConfig() (*Config, error) {
	data, err := os.ReadFile(".matrix/config.json")
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
