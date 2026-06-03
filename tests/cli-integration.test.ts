import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, readText, removeDir, runCli } from "./helpers.js"

describe("CLI integration and package output", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("supports send with multiple files through the unified flow", async () => {
    const dir = await makeTempDir("slack-shoot-unified-")
    try {
      const one = join(dir, "one.txt")
      const two = join(dir, "two.mp4")
      await writeFile(one, "one", "utf8")
      await writeFile(two, "two", "utf8")
      const result = await runCli(["send", "files", "--file", one, "--file", two], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "C123",
          SLACK_SHOOT_MOCK: "upload_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Uploaded one.txt to C123")
      expect(result.stdout).toContain("Uploaded two.mp4 to C123")
    } finally {
      await removeDir(dir)
    }
  })

  it("emits a runnable CLI with a shebang", async () => {
    const cliText = await readText(join(process.cwd(), "dist", "cli.js"))

    expect(cliText.startsWith("#!/usr/bin/env node")).toBe(true)
  })

  it("runs from a different current working directory", async () => {
    const dir = await makeTempDir("slack-shoot-cwd-")
    try {
      const result = await runCli(["send", "linked qa"], {
        cwd: dir,
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "C123",
          SLACK_SHOOT_MOCK: "send_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Message sent to C123")
    } finally {
      await removeDir(dir)
    }
  })
})
