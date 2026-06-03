#!/usr/bin/env node
import { access, stat } from "node:fs/promises"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename } from "node:path"
import { join } from "node:path"
import { password, isCancel } from "@clack/prompts"
import { cacheChannels, resolveChannel } from "./channels.js"
import { helpText, parseFlags, readStdinText } from "./cli-utils.js"
import type { ParsedFlags } from "./cli-utils.js"
import {
  effectiveChannel,
  effectiveToken,
  readConfig,
  redactToken,
  writeConfig
} from "./config.js"
import { CliError, FileInputError, formatUnknownError } from "./errors.js"
import { createSlackClient } from "./slack.js"

async function requireToken(): Promise<string> {
  const config = await readConfig()
  const token = effectiveToken(config)
  if (token === undefined) {
    throw new CliError("No Slack token configured. Run slack-shoot login --token <xoxb-token>.")
  }
  return token
}

async function commandLogin(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const token = parsed.values["token"] ?? (await promptForToken())
  const slack = createSlackClient()
  await slack.authTest(token)
  const config = await readConfig()
  await writeConfig({ ...config, token })
  process.stdout.write("Login verified. Next: slack-shoot sync\n")
}

async function promptForToken(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError("Interactive login requires --token in non-interactive agent runs.")
  }
  const token = await password({
    message: "Slack bot token",
    mask: "*",
    validate: (value) => {
      return value.trim().length > 0 ? undefined : "Token is required"
    }
  })
  if (isCancel(token)) {
    throw new CliError("Login cancelled")
  }
  return token.trim()
}

async function commandSync(): Promise<void> {
  const token = await requireToken()
  const slack = createSlackClient()
  const channels = cacheChannels(await slack.listChannels(token))
  const config = await readConfig()
  await writeConfig({ ...config, channels, syncedAt: new Date().toISOString() })
  process.stdout.write(`Cached ${channels.length} ${channels.length === 1 ? "channel" : "channels"}\n`)
  process.stdout.write("Next: slack-shoot config set-default slack-shoot\n")
}

async function commandConfig(args: readonly string[]): Promise<void> {
  const subcommand = args[0]
  if (subcommand === "set-default") {
    const requested = args[1]
    if (requested === undefined) {
      throw new CliError("Usage: slack-shoot config set-default <channel>")
    }
    const config = await readConfig()
    const resolved = resolveChannel(requested, config)
    await writeConfig({ ...config, defaultChannel: requested })
    process.stdout.write(`Default channel set to ${requested} (${resolved})\n`)
    return
  }
  if (subcommand === "show") {
    const config = await readConfig()
    const token = effectiveToken(config)
    const channel = effectiveChannel(config)
    process.stdout.write(`Token: ${redactToken(token)}\n`)
    process.stdout.write(`Default channel: ${config.defaultChannel ?? "not configured"}\n`)
    process.stdout.write(`Effective channel: ${channel ?? "not configured"}\n`)
    process.stdout.write(`Cached channels: ${config.channels.length}\n`)
    return
  }
  throw new CliError("Usage: slack-shoot config <set-default|show>")
}

async function messageText(parsed: ParsedFlags): Promise<string> {
  const explicit = parsed.values["text"] ?? parsed.positionals.join(" ")
  if (explicit.trim().length > 0) {
    return explicit
  }
  const piped = await readStdinText()
  if (piped.trim().length > 0) {
    return piped.trim()
  }
  throw new CliError("Message text is empty")
}

async function existingFile(path: string): Promise<void> {
  try {
    const info = await stat(path)
    if (!info.isFile()) {
      throw new FileInputError(`File not found: ${path}`)
    }
    await access(path)
  } catch (error) {
    if (error instanceof FileInputError) {
      throw error
    }
    throw new FileInputError(`File not found: ${path}`)
  }
}

async function uploadFiles(input: {
  readonly token: string
  readonly channel: string
  readonly files: readonly string[]
  readonly message?: string
}): Promise<void> {
  const slack = createSlackClient()
  const succeeded: string[] = []
  for (let index = 0; index < input.files.length; index += 1) {
    const filePath = input.files[index]
    if (filePath === undefined) {
      continue
    }
    await existingFile(filePath)
    try {
      const result = await slack.uploadFile({
        token: input.token,
        channel: input.channel,
        filePath,
        uploadIndex: index,
        ...(input.message === undefined ? {} : { message: input.message })
      })
      succeeded.push(result.filename)
      process.stdout.write(`Uploaded ${result.filename} to ${result.channel} (${result.order})\n`)
    } catch (error) {
      const prior = succeeded.length > 0 ? `${succeeded.join(", ")} succeeded; ` : ""
      throw new CliError(`${prior}${basename(filePath)} failed: ${formatUnknownError(error)}`)
    }
  }
}

async function commandSend(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const config = await readConfig()
  const channelInput = effectiveChannel(config, parsed.values["channel"])
  if (channelInput === undefined) {
    throw new CliError("No channel provided. Use --channel or slack-shoot config set-default.")
  }
  const channel = resolveChannel(channelInput, config)
  const token = await requireToken()
  const text = await messageText(parsed)
  if (parsed.files.length > 0) {
    await uploadFiles({ token, channel, files: parsed.files, message: text })
    return
  }
  const result = await createSlackClient().postMessage({ token, channel, text })
  process.stdout.write(`Message sent to ${result.channel} at ${result.ts}\n`)
}

async function commandUpload(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const config = await readConfig()
  const channelInput = effectiveChannel(config, parsed.values["channel"])
  if (channelInput === undefined) {
    throw new CliError("No channel provided. Use --channel or slack-shoot config set-default.")
  }
  const token = await requireToken()
  await uploadFiles({
    token,
    channel: resolveChannel(channelInput, config),
    files: parsed.positionals,
    ...(parsed.values["message"] === undefined ? {} : { message: parsed.values["message"] })
  })
}

async function commandLiveQa(): Promise<void> {
  const token = process.env["SLACK_SHOOT_LIVE_TOKEN"]
  const channel = process.env["SLACK_SHOOT_LIVE_CHANNEL"]
  if ((token === undefined || token.length === 0) && (channel === undefined || channel.length === 0)) {
    process.stdout.write("Skipping live Slack QA: SLACK_SHOOT_LIVE_TOKEN and SLACK_SHOOT_LIVE_CHANNEL are not set.\n")
    return
  }
  if (token === undefined || token.length === 0 || channel === undefined || channel.length === 0) {
    throw new CliError("Both SLACK_SHOOT_LIVE_TOKEN and SLACK_SHOOT_LIVE_CHANNEL are required.")
  }
  const tempDir = await mkdtemp(join(tmpdir(), "slack-shoot-live-"))
  const tempFile = join(tempDir, "slack-shoot-live.txt")
  try {
    await writeFile(tempFile, `slack-shoot live QA ${new Date().toISOString()}\n`, "utf8")
    const slack = createSlackClient()
    await slack.authTest(token)
    const posted = await slack.postMessage({
      token,
      channel,
      text: `slack-shoot live QA ${new Date().toISOString()}`
    })
    process.stdout.write(`Live text sent to ${posted.channel} at ${posted.ts}\n`)
    const uploaded = await slack.uploadFile({
      token,
      channel,
      filePath: tempFile,
      message: "slack-shoot live QA upload",
      uploadIndex: 0
    })
    process.stdout.write(`Live upload sent: ${uploaded.filename} to ${uploaded.channel}\n`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export async function run(argv: readonly string[]): Promise<void> {
  const command = argv[0]
  const args = argv.slice(1)
  if (command === undefined || command === "--help" || command === "-h") {
    process.stdout.write(helpText())
    return
  }
  switch (command) {
    case "login":
      await commandLogin(args)
      return
    case "sync":
      await commandSync()
      return
    case "config":
      await commandConfig(args)
      return
    case "send":
      await commandSend(args)
      return
    case "upload":
      await commandUpload(args)
      return
    case "__qa-live":
      await commandLiveQa()
      return
    default:
      throw new CliError(`Unknown command: ${command}`)
  }
}

async function main(): Promise<void> {
  try {
    await run(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${formatUnknownError(error)}\n`)
    process.exitCode = error instanceof CliError ? error.exitCode : 1
  }
}

await main()
