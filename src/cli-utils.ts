import { stdin } from "node:process"

export type ParsedFlags = {
  readonly values: Readonly<Record<string, string>>
  readonly files: readonly string[]
  readonly positionals: readonly string[]
}

export function helpText(): string {
  return `shoot

Commands:
  login [slack|discord] --token <token>
  sync
  channels
  config set-default <channel> [--provider slack|discord]
  config show
  send [message] [--provider slack|discord] [--channel <channel>] [--file <path> ...]
  upload <path...> [--provider slack|discord] [--message <text>] [--channel <channel>]
`
}

export function parseFlags(args: readonly string[]): ParsedFlags {
  const values: Record<string, string> = {}
  const files: string[] = []
  const positionals: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const next = args[index + 1]
    if (arg === undefined) {
      continue
    }
    if (isValueFlag(arg) && next !== undefined) {
      values[arg.slice(2)] = next
      index += 1
      continue
    }
    if (arg === "--file" && next !== undefined) {
      files.push(next)
      index += 1
      continue
    }
    positionals.push(arg)
  }
  return { values, files, positionals }
}

export async function readStdinText(): Promise<string> {
  if (stdin.isTTY) {
    return ""
  }
  const chunks: Buffer[] = []
  return await new Promise<string>((resolve, reject) => {
    stdin.on("data", (chunk: Buffer) => chunks.push(chunk))
    stdin.on("error", (error) => reject(error))
    stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
  })
}

function isValueFlag(value: string): boolean {
  return value === "--token" || value === "--channel" || value === "--message" || value === "--text"
    || value === "--provider"
}
