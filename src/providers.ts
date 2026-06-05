import type { ParsedFlags } from "./cli-utils.js"
import { CliError } from "./errors.js"

export const Provider = {
  Slack: "slack",
  Discord: "discord"
} as const

export type Provider = (typeof Provider)[keyof typeof Provider]

export function providerFromFlags(parsed: ParsedFlags): Provider {
  const requested = parsed.values["provider"] ?? Provider.Slack
  if (requested === Provider.Slack || requested === Provider.Discord) {
    return requested
  }
  throw new CliError("Provider must be slack or discord")
}

export function providerFromLoginArgs(args: readonly string[], parsed: ParsedFlags): Provider {
  const first = args[0]
  if (first === Provider.Slack || first === Provider.Discord) {
    return first
  }
  return providerFromFlags(parsed)
}
