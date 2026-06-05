import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { request } from "node:https"
import { basename } from "node:path"
import { DiscordError } from "./errors.js"
import type { DiscordClient } from "./discord-types.js"

const discordHost = "discord.com"
const discordApiBase = "/api/v10"

type DiscordMessageResponse = {
  readonly id?: string
  readonly channel_id?: string
}

export function createWebApiDiscordClient(): DiscordClient {
  return {
    authTest: async (token) => {
      await requestJson({ token, method: "GET", path: "/users/@me" })
    },
    postMessage: async ({ token, channel, text }) => {
      const response = await requestJson({
        token,
        method: "POST",
        path: `/channels/${encodeURIComponent(channel)}/messages`,
        body: JSON.stringify({ content: text }),
        contentType: "application/json"
      })
      return { channel, id: response.id ?? "unknown" }
    },
    uploadFile: async ({ token, channel, filePath, message }) => {
      await requestMultipart({
        token,
        channel,
        filePath,
        ...(message === undefined ? {} : { message })
      })
      return { channel, filename: basename(filePath) }
    }
  }
}

function requestJson(input: {
  readonly token: string
  readonly method: "GET" | "POST"
  readonly path: string
  readonly body?: string
  readonly contentType?: string
}): Promise<DiscordMessageResponse> {
  return new Promise((resolve, reject) => {
    const body = input.body ?? ""
    const req = request(
      {
        hostname: discordHost,
        path: `${discordApiBase}${input.path}`,
        method: input.method,
        headers: {
          Authorization: `Bot ${input.token}`,
          "Content-Type": input.contentType ?? "application/json",
          ...(body.length > 0 ? { "Content-Length": Buffer.byteLength(body) } : {})
        }
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parseDiscordResponse(text))
            return
          }
          reject(discordStatusError(res.statusCode))
        })
      }
    )
    req.on("error", () => reject(new DiscordError("Discord network request failed")))
    if (body.length > 0) {
      req.write(body)
    }
    req.end()
  })
}

async function requestMultipart(input: {
  readonly token: string
  readonly channel: string
  readonly filePath: string
  readonly message?: string
}): Promise<void> {
  const boundary = `shoot-${Date.now().toString(36)}`
  const filename = basename(input.filePath)
  const info = await stat(input.filePath)
  const payload = JSON.stringify(input.message === undefined ? {} : { content: input.message })
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${payload}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="files[0]"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    "utf8"
  )
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8")
  await new Promise<void>((resolve, reject) => {
    const req = request(
      {
        hostname: discordHost,
        path: `${discordApiBase}/channels/${encodeURIComponent(input.channel)}/messages`,
        method: "POST",
        headers: {
          Authorization: `Bot ${input.token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": header.byteLength + info.size + footer.byteLength
        }
      },
      (res) => {
        res.resume()
        res.on("end", () => {
          if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
            return
          }
          reject(discordStatusError(res.statusCode))
        })
      }
    )
    req.on("error", () => reject(new DiscordError("Discord network request failed")))
    req.write(header)
    createReadStream(input.filePath)
      .on("error", () => reject(new DiscordError("Discord file upload failed")))
      .on("end", () => {
        req.write(footer)
        req.end()
      })
      .pipe(req, { end: false })
  })
}

function parseDiscordResponse(text: string): DiscordMessageResponse {
  if (text.trim().length === 0) {
    return {}
  }
  const parsed = JSON.parse(text)
  if (typeof parsed !== "object" || parsed === null) {
    return {}
  }
  return parsed
}

function discordStatusError(statusCode: number | undefined): DiscordError {
  if (statusCode === 401) {
    return new DiscordError("Discord authentication failed")
  }
  if (statusCode === 403) {
    return new DiscordError("Discord bot cannot post to channel")
  }
  if (statusCode === 404) {
    return new DiscordError("Discord channel was not found")
  }
  return new DiscordError(`Discord HTTP request failed with status ${statusCode ?? "unknown"}`)
}
