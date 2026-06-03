import type { AppConfig, CachedChannel } from "./config.js"
import { ConfigError } from "./errors.js"

export function normalizeChannelInput(value: string): string {
  return value.startsWith("#") ? value.slice(1) : value
}

export function isSlackChannelId(value: string): boolean {
  return /^[CGD][A-Z0-9]+$/.test(value)
}

export function resolveChannel(value: string, config: AppConfig): string {
  const normalized = normalizeChannelInput(value)
  if (isSlackChannelId(normalized)) {
    return normalized
  }

  const matches = config.channels.filter(
    (channel) => channel.name === normalized && !channel.isArchived
  )
  if (matches.length > 1) {
    throw new ConfigError(`duplicate channel name "${normalized}"; use an explicit channel ID`)
  }
  const first = matches[0]
  if (first !== undefined) {
    return first.id
  }
  return normalized
}

export function cacheChannels(channels: readonly CachedChannel[]): AppConfig["channels"] {
  return channels.filter((channel) => !channel.isArchived)
}
