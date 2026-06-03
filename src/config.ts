import { chmod, mkdir, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join } from "node:path"
import { z } from "zod"
import { ConfigError } from "./errors.js"
import { envValue } from "./env.js"

const ChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isPrivate: z.boolean(),
  isArchived: z.boolean()
})

const ConfigSchema = z.object({
  token: z.string().optional(),
  defaultChannel: z.string().optional(),
  channels: z.array(ChannelSchema).default([]),
  syncedAt: z.string().optional()
})

export type CachedChannel = z.infer<typeof ChannelSchema>
export type AppConfig = z.infer<typeof ConfigSchema>

export type ConfigPaths = {
  readonly dir: string
  readonly file: string
}

export function configPaths(): ConfigPaths {
  const override = envValue("SLACK_SHOOT_CONFIG_DIR")
  if (override !== undefined) {
    return { dir: override, file: join(override, "config.json") }
  }
  const xdg = envValue("XDG_CONFIG_HOME")
  const base = xdg ?? join(homedir(), ".config")
  const dir = join(base, "slack-shoot")
  return { dir, file: join(dir, "config.json") }
}

export function emptyConfig(): AppConfig {
  return { channels: [] }
}

export async function readConfig(): Promise<AppConfig> {
  const paths = configPaths()
  try {
    const text = await readFile(paths.file, "utf8")
    const parsed = JSON.parse(text)
    return ConfigSchema.parse(parsed)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new ConfigError("Config file is malformed")
    }
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return emptyConfig()
    }
    throw error
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  const paths = configPaths()
  await mkdir(paths.dir, { recursive: true })
  await writeFile(paths.file, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  await chmod(paths.file, 0o600)
}

export function effectiveToken(config: AppConfig): string | undefined {
  return envValue("SLACK_SHOOT_TOKEN") ?? config.token
}

export function effectiveChannel(config: AppConfig, explicit?: string): string | undefined {
  return explicit ?? envValue("SLACK_SHOOT_CHANNEL") ?? config.defaultChannel
}

export function redactToken(token: string | undefined): string {
  if (token === undefined) {
    return "not configured"
  }
  return token.startsWith("xoxb-") ? "xoxb-REDACTED" : "REDACTED"
}
