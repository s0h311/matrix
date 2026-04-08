type UsageData = {
  fiveHourUsage: number
}

export async function usageLimitReached(): Promise<boolean> {
  const usage = await getUsage()

  return usage?.fiveHourUsage === 0
}

export async function getUsage(): Promise<UsageData | null> {
  const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-beta': 'oauth-2025-04-20',
      Authorization: `Bearer ${process.env.CLAUDE_CODE_KEY}`,
    },
  }).then((r) => r.json())

  if ('five_hour' in response) {
    return response.five_hour.utilization
  }

  return null
}
