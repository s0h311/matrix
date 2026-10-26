import { execSync } from 'child_process'

export async function usageLimitReached(): Promise<{
  limitReached: boolean
  resetsAt: Date
}> {
  const result = execSync('claude -p "/usage"', {
    encoding: 'utf-8',
  })

  const usageRegex = /Current session: (\d+)%.*resets (.+)/

  const matches = result.match(usageRegex)

  if (!matches || !matches[1] || !matches[2]) {
    throw new Error('Unable to parse usage')
  }

  const usage = Number(matches[1])
  const currentYearString = String(new Date().getFullYear())
  const resetsAt = new Date(matches[2].replace('at', currentYearString))

  return {
    limitReached: usage === 100,
    resetsAt,
  }
}
