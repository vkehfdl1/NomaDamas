#!/usr/bin/env node
import { password, isCancel } from "@clack/prompts"
import { cacheChannels, resolveChannel } from "./channels.js"
import { helpText, parseFlags, readStdinText } from "./cli-utils.js"
import type { ParsedFlags } from "./cli-utils.js"
import {
  effectiveChannel,
  effectiveDiscordChannel,
  effectiveDiscordToken,
  effectiveToken,
  readConfig,
  redactToken,
  writeConfig
} from "./config.js"
import { createDiscordClient } from "./discord.js"
import { CliError, formatUnknownError } from "./errors.js"
import { commandLiveQa } from "./live-qa.js"
import { Provider, providerFromFlags, providerFromLoginArgs } from "./providers.js"
import type { Provider as ProviderName } from "./providers.js"
import { createSlackClient } from "./slack.js"
import { uploadDiscordFiles, uploadSlackFiles } from "./upload.js"

async function requireSlackToken(): Promise<string> {
  const config = await readConfig()
  const token = effectiveToken(config)
  if (token === undefined) {
    throw new CliError("No Slack token configured. Run shoot login slack --token <xoxb-token>.")
  }
  return token
}

async function requireDiscordToken(): Promise<string> {
  const config = await readConfig()
  const token = effectiveDiscordToken(config)
  if (token === undefined) {
    throw new CliError("No Discord token configured. Run shoot login discord --token <bot-token>.")
  }
  return token
}

async function commandLogin(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const provider = providerFromLoginArgs(args, parsed)
  const tokenArgs = args[0] === Provider.Slack || args[0] === Provider.Discord ? args.slice(1) : args
  const token = parseFlags(tokenArgs).values["token"] ?? (await promptForToken(provider))
  const config = await readConfig()
  if (provider === Provider.Discord) {
    await createDiscordClient().authTest(token)
    await writeConfig({ ...config, discordToken: token })
    process.stdout.write("Discord login verified. Next: shoot send --provider discord\n")
    return
  }
  await createSlackClient().authTest(token)
  await writeConfig({ ...config, token })
  process.stdout.write("Login verified. Next: shoot sync\n")
}

async function promptForToken(provider: ProviderName): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError("Interactive login requires --token in non-interactive agent runs.")
  }
  const token = await password({
    message: provider === Provider.Discord ? "Discord bot token" : "Slack bot token",
    mask: "*",
    validate: (value) => (value.trim().length > 0 ? undefined : "Token is required")
  })
  if (isCancel(token)) {
    throw new CliError("Login cancelled")
  }
  return token.trim()
}

async function commandSync(): Promise<void> {
  const token = await requireSlackToken()
  const channels = cacheChannels(await createSlackClient().listChannels(token))
  const config = await readConfig()
  await writeConfig({ ...config, channels, syncedAt: new Date().toISOString() })
  process.stdout.write(`Cached ${channels.length} ${channels.length === 1 ? "channel" : "channels"}\n`)
  process.stdout.write("Next: shoot config set-default <channel>\n")
}

async function commandChannels(): Promise<void> {
  const config = await readConfig()
  if (config.channels.length === 0) {
    process.stdout.write("No cached channels. Run shoot sync to fetch Slack channels visible to the bot.\n")
    return
  }
  for (const channel of config.channels) {
    const visibility = channel.isPrivate ? "private" : "public"
    process.stdout.write(`${channel.name}\t${channel.id}\t${visibility}\n`)
  }
}

async function commandConfig(args: readonly string[]): Promise<void> {
  const subcommand = args[0]
  if (subcommand === "set-default") {
    const parsed = parseFlags(args.slice(1))
    const requested = parsed.positionals[0]
    if (requested === undefined) {
      throw new CliError("Usage: shoot config set-default <channel> [--provider slack|discord]")
    }
    const provider = providerFromFlags(parsed)
    const config = await readConfig()
    if (provider === Provider.Discord) {
      await writeConfig({ ...config, discordDefaultChannel: requested })
      process.stdout.write(`Default Discord channel set to ${requested}\n`)
      return
    }
    const resolved = resolveChannel(requested, config)
    await writeConfig({ ...config, defaultChannel: requested })
    process.stdout.write(`Default Slack channel set to ${requested} (${resolved})\n`)
    return
  }
  if (subcommand === "show") {
    const config = await readConfig()
    process.stdout.write(`Slack token: ${redactToken(effectiveToken(config))}\n`)
    process.stdout.write(`Slack default channel: ${config.defaultChannel ?? "not configured"}\n`)
    process.stdout.write(`Slack effective channel: ${effectiveChannel(config) ?? "not configured"}\n`)
    process.stdout.write(`Discord token: ${redactToken(effectiveDiscordToken(config))}\n`)
    process.stdout.write(`Discord default channel: ${config.discordDefaultChannel ?? "not configured"}\n`)
    process.stdout.write(`Discord effective channel: ${effectiveDiscordChannel(config) ?? "not configured"}\n`)
    process.stdout.write(`Cached channels: ${config.channels.length}\n`)
    return
  }
  throw new CliError("Usage: shoot config <set-default|show>")
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

async function commandSend(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const provider = providerFromFlags(parsed)
  if (provider === Provider.Discord) {
    await commandSendDiscord(parsed)
    return
  }
  await commandSendSlack(parsed)
}

async function commandSendSlack(parsed: ParsedFlags): Promise<void> {
  const config = await readConfig()
  const channelInput = effectiveChannel(config, parsed.values["channel"])
  if (channelInput === undefined) {
    throw new CliError("No channel provided. Use --channel or shoot config set-default.")
  }
  const channel = resolveChannel(channelInput, config)
  const token = await requireSlackToken()
  const text = await messageText(parsed)
  if (parsed.files.length > 0) {
    await uploadSlackFiles({ token, channel, files: parsed.files, message: text })
    return
  }
  const result = await createSlackClient().postMessage({ token, channel, text })
  process.stdout.write(`Message sent to ${result.channel} at ${result.ts}\n`)
}

async function commandSendDiscord(parsed: ParsedFlags): Promise<void> {
  const config = await readConfig()
  const channel = effectiveDiscordChannel(config, parsed.values["channel"])
  if (channel === undefined) {
    throw new CliError("No Discord channel provided. Use --channel or shoot config set-default --provider discord.")
  }
  const token = await requireDiscordToken()
  const text = await messageText(parsed)
  if (parsed.files.length > 0) {
    await uploadDiscordFiles({ token, channel, files: parsed.files, message: text })
    return
  }
  const result = await createDiscordClient().postMessage({ token, channel, text })
  process.stdout.write(`Message sent to discord:${result.channel} at ${result.id}\n`)
}

async function commandUpload(args: readonly string[]): Promise<void> {
  const parsed = parseFlags(args)
  const provider = providerFromFlags(parsed)
  if (provider === Provider.Discord) {
    const config = await readConfig()
    const channel = effectiveDiscordChannel(config, parsed.values["channel"])
    if (channel === undefined) {
      throw new CliError("No Discord channel provided. Use --channel or shoot config set-default --provider discord.")
    }
    await uploadDiscordFiles({
      token: await requireDiscordToken(),
      channel,
      files: parsed.positionals,
      ...(parsed.values["message"] === undefined ? {} : { message: parsed.values["message"] })
    })
    return
  }
  const config = await readConfig()
  const channelInput = effectiveChannel(config, parsed.values["channel"])
  if (channelInput === undefined) {
    throw new CliError("No channel provided. Use --channel or shoot config set-default.")
  }
  await uploadSlackFiles({
    token: await requireSlackToken(),
    channel: resolveChannel(channelInput, config),
    files: parsed.positionals,
    ...(parsed.values["message"] === undefined ? {} : { message: parsed.values["message"] })
  })
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
    case "channels":
      await commandChannels()
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
