import { discordEnvMode } from "./env.js"
import { createMockDiscordClient } from "./discord-mock.js"
import type { DiscordClient } from "./discord-types.js"
import { createWebApiDiscordClient } from "./discord-web.js"

export function createDiscordClient(): DiscordClient {
  const mode = discordEnvMode()
  if (mode !== undefined) {
    return createMockDiscordClient(mode)
  }
  return createWebApiDiscordClient()
}
