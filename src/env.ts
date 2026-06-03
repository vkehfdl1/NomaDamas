export function envValue(name: string): string | undefined {
  const value = process.env[name]
  if (value === undefined || value.length === 0) {
    return undefined
  }
  return value
}

export function envMode(): string | undefined {
  return envValue("SLACK_SHOOT_MOCK")
}
