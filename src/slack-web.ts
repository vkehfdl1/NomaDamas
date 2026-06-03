import { basename } from "node:path"
import { WebClient, WebClientEvent } from "@slack/web-api"
import type { CachedChannel } from "./config.js"
import { envValue } from "./env.js"
import { SlackError } from "./errors.js"
import { isRateLimitedError, normalizeSlackError } from "./slack-errors.js"
import type { SlackClient } from "./slack-types.js"

const defaultRetryAfterMs = 3_000
const slackApiLimit = 200

export function createWebApiSlackClient(): SlackClient {
  return {
    authTest: async (token) => {
      await retryOnceOnRateLimit(async () => {
        await webClient(token).auth.test()
      })
    },
    listChannels: async (token) => {
      return await retryOnceOnRateLimit(async () => listAllChannels(webClient(token)))
    },
    postMessage: async ({ token, channel, text }) => {
      try {
        return await retryOnceOnRateLimit(async () => {
          const response = await webClient(token).chat.postMessage({ channel, text })
          return { channel, ts: requiredString(response.ts, "Slack did not return a message timestamp") }
        })
      } catch (error) {
        throw normalizeSlackError(error)
      }
    },
    uploadFile: async ({ token, channel, filePath, message }) => {
      try {
        return await uploadViaExternalFlow({
          token,
          channel,
          filePath,
          ...(message === undefined ? {} : { message })
        })
      } catch (error) {
        throw normalizeSlackError(error)
      }
    }
  }
}

async function listAllChannels(client: WebClient): Promise<readonly CachedChannel[]> {
  const channels: CachedChannel[] = []
  let cursor: string | undefined
  do {
    const page = await client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: false,
      limit: slackApiLimit,
      ...(cursor === undefined ? {} : { cursor })
    })
    for (const channel of page.channels ?? []) {
      if (channel.id !== undefined && channel.name !== undefined) {
        channels.push({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private ?? false,
          isArchived: channel.is_archived ?? false
        })
      }
    }
    cursor = page.response_metadata?.next_cursor || undefined
  } while (cursor !== undefined && cursor.length > 0)
  return channels
}

async function uploadViaExternalFlow(input: {
  readonly token: string
  readonly channel: string
  readonly filePath: string
  readonly message?: string
}) {
  const filename = basename(input.filePath)
  const client = webClient(input.token)
  await retryOnceOnRateLimit(async () => {
    await client.filesUploadV2({
      channel_id: input.channel,
      file: input.filePath,
      filename,
      title: filename,
      ...(input.message === undefined ? {} : { initial_comment: input.message })
    })
  })
  return {
    channel: input.channel,
    filename,
    order: "uploadV2"
  }
}

function webClient(token: string): WebClient {
  const client = new WebClient(token, {
    retryConfig: { retries: 0 },
    rejectRateLimitedCalls: true
  })
  client.on(WebClientEvent.RATE_LIMITED, () => undefined)
  return client
}

async function retryOnceOnRateLimit<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (!isRateLimitedError(error)) {
      throw error
    }
    const waitMs = Math.min(error.retryAfter * 1_000, maxRetryAfterMs())
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    process.stderr.write("retried after rate limit\n")
    return await operation()
  }
}

function maxRetryAfterMs(): number {
  const parsed = Number(envValue("SLACK_SHOOT_MAX_RETRY_AFTER_MS"))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultRetryAfterMs
}

function requiredString(value: string | undefined, message: string): string {
  if (value === undefined) {
    throw new SlackError(message)
  }
  return value
}
