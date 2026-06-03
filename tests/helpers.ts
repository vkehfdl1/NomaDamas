import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

export const projectRoot = fileURLToPath(new URL("..", import.meta.url))
export const cliDist = join(projectRoot, "dist", "cli.js")

export type RunResult = {
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}

export async function makeTempDir(prefix: string): Promise<string> {
  return await mkdtemp(join(tmpdir(), prefix))
}

export async function removeDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true })
}

export async function runCli(
  args: readonly string[],
  options: {
    readonly env?: Readonly<Record<string, string>>
    readonly input?: string
    readonly cwd?: string
  } = {}
): Promise<RunResult> {
  const child = spawn("node", [cliDist, ...args], {
    cwd: options.cwd ?? projectRoot,
    env: { ...process.env, ...options.env },
    stdio: ["pipe", "pipe", "pipe"]
  })

  if (options.input !== undefined) {
    child.stdin.write(options.input)
  }
  child.stdin.end()

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk))
  child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk))

  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1))
  })

  return {
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    exitCode
  }
}

export async function buildCli(): Promise<RunResult> {
  const child = spawn("npm", ["run", "build"], {
    cwd: projectRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  })

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk))
  child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk))

  const exitCode = await new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 1))
  })

  return {
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    exitCode
  }
}

export async function readText(path: string): Promise<string> {
  return await readFile(path, "utf8")
}

export async function writeText(path: string, value: string): Promise<void> {
  await writeFile(path, value, "utf8")
}

export async function fileMode(path: string): Promise<number> {
  const info = await stat(path)
  return info.mode & 0o777
}
