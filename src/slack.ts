import { envMode } from "./env.js"
import { createMockSlackClient } from "./slack-mock.js"
import type { SlackClient } from "./slack-types.js"
import { createWebApiSlackClient } from "./slack-web.js"

export type { PostedMessage, SlackClient, UploadedFile } from "./slack-types.js"

export function createSlackClient(): SlackClient {
  const mode = envMode()
  if (mode !== undefined) {
    return createMockSlackClient(mode)
  }
  return createWebApiSlackClient()
}
