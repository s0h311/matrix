package main

import (
	"encoding/json"
	"net/http"
	"os"
)

type UsageData struct {
	FiveHourUsage int
}

func usageLimitReached() bool {
	usage, err := getUsage()
	if err != nil {
		return false
	}
	return usage != nil && usage.FiveHourUsage == 0
}

func getUsage() (*UsageData, error) {
	req, err := http.NewRequest(http.MethodGet, "https://api.anthropic.com/api/oauth/usage", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("anthropic-beta", "oauth-2025-04-20")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CLAUDE_CODE_KEY"))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var raw map[string]json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, err
	}

	fiveHour, ok := raw["five_hour"]
	if !ok {
		return nil, nil
	}

	var utilization struct {
		Utilization struct {
			FiveHourUsage int `json:"fiveHourUsage"`
		} `json:"utilization"`
	}
	if err := json.Unmarshal(fiveHour, &utilization); err != nil {
		return nil, err
	}

	return &UsageData{FiveHourUsage: utilization.Utilization.FiveHourUsage}, nil
}
