import { basename } from "node:path"
import { DiscordError } from "./errors.js"
import type { DiscordClient } from "./discord-types.js"

export function createMockDiscordClient(mode: string): DiscordClient {
  return {
    authTest: async () => {
      if (mode === "invalid_auth") {
        throw new DiscordError("Discord authentication failed")
      }
    },
    postMessage: async ({ channel, text }) => {
      if (mode === "invalid_auth") {
        throw new DiscordError("Discord authentication failed")
      }
      if (mode === "network_error") {
        throw new DiscordError("Discord network request failed")
      }
      if (text.trim().length === 0) {
        throw new DiscordError("Message text is empty")
      }
      return { channel, id: "discord-message-123" }
    },
    uploadFile: async ({ channel, filePath }) => {
      if (mode === "invalid_auth") {
        throw new DiscordError("Discord authentication failed")
      }
      return { channel, filename: basename(filePath) }
    }
  }
}
