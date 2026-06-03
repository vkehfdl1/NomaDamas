import { basename } from "node:path"
import type { SlackClient } from "./slack-types.js"
import { SlackError } from "./errors.js"

export function createMockSlackClient(mode: string): SlackClient {
  return {
    authTest: async () => {
      if (mode === "invalid_auth") {
        throw new SlackError("Slack authentication failed")
      }
    },
    listChannels: async () => {
      if (mode === "invalid_auth") {
        throw new SlackError("Slack authentication failed")
      }
      if (mode === "missing_scope") {
        throw new SlackError("Slack app is missing required scope")
      }
      if (mode === "rate_limit_once") {
        process.stderr.write("retried after rate limit\n")
        return [{ id: "C123", name: "slack-shoot", isPrivate: false, isArchived: false }]
      }
      if (mode === "channels_duplicate") {
        return [
          { id: "C111", name: "slack-shoot", isPrivate: false, isArchived: false },
          { id: "G222", name: "slack-shoot", isPrivate: true, isArchived: false }
        ]
      }
      return [
        { id: "C123", name: "slack-shoot", isPrivate: false, isArchived: false },
        { id: "G234", name: "private-shoot", isPrivate: true, isArchived: false },
        { id: "C999", name: "archived", isPrivate: false, isArchived: true }
      ]
    },
    postMessage: async ({ channel, text }) => {
      if (mode === "network_error") {
        throw new SlackError("Slack network request failed")
      }
      if (mode === "not_in_channel") {
        throw new SlackError("Slack bot is not in channel")
      }
      if (text.trim().length === 0) {
        throw new SlackError("Message text is empty")
      }
      return { channel, ts: "123.456" }
    },
    uploadFile: async ({ channel, filePath, uploadIndex }) => {
      const filename = basename(filePath)
      if (mode === "upload_second_fails" && uploadIndex === 1) {
        throw new SlackError(`${filename} failed during upload`)
      }
      return { channel, filename, order: "uploadV2" }
    }
  }
}
