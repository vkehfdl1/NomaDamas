import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CliError } from "./errors.js"
import { createSlackClient } from "./slack.js"

export async function commandLiveQa(): Promise<void> {
  const token = process.env["SHOOT_LIVE_TOKEN"] ?? process.env["SLACK_SHOOT_LIVE_TOKEN"]
  const channel = process.env["SHOOT_LIVE_CHANNEL"] ?? process.env["SLACK_SHOOT_LIVE_CHANNEL"]
  if ((token === undefined || token.length === 0) && (channel === undefined || channel.length === 0)) {
    process.stdout.write("Skipping live Slack QA: SHOOT_LIVE_TOKEN and SHOOT_LIVE_CHANNEL are not set.\n")
    return
  }
  if (token === undefined || token.length === 0 || channel === undefined || channel.length === 0) {
    throw new CliError("Both SHOOT_LIVE_TOKEN and SHOOT_LIVE_CHANNEL are required.")
  }
  const tempDir = await mkdtemp(join(tmpdir(), "shoot-live-"))
  const tempFile = join(tempDir, "shoot-live.txt")
  try {
    await writeFile(tempFile, `shoot live QA ${new Date().toISOString()}\n`, "utf8")
    const slack = createSlackClient()
    await slack.authTest(token)
    const posted = await slack.postMessage({ token, channel, text: `shoot live QA ${new Date().toISOString()}` })
    process.stdout.write(`Live text sent to ${posted.channel} at ${posted.ts}\n`)
    const uploaded = await slack.uploadFile({
      token,
      channel,
      filePath: tempFile,
      message: "shoot live QA upload",
      uploadIndex: 0
    })
    process.stdout.write(`Live upload sent: ${uploaded.filename} to ${uploaded.channel}\n`)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
