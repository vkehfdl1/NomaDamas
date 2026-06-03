import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("upload command", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("uploads an image with a message through the external upload flow", async () => {
    const dir = await makeTempDir("slack-shoot-upload-")
    try {
      const imagePath = join(dir, "pic.png")
      await writeFile(imagePath, "fakepng", "utf8")
      const result = await runCli(["upload", imagePath, "--message", "image qa"], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "C123",
          SLACK_SHOOT_MOCK: "upload_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Uploaded pic.png to C123")
      expect(result.stdout).toContain("get URL -> PUT -> complete")
    } finally {
      await removeDir(dir)
    }
  })

  it("fails before Slack upload when a file is missing", async () => {
    const dir = await makeTempDir("slack-shoot-upload-missing-")
    try {
      const result = await runCli(["upload", join(dir, "missing.mp4")], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "C123"
        }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("File not found")
    } finally {
      await removeDir(dir)
    }
  })

  it("reports prior success when the second upload fails", async () => {
    const dir = await makeTempDir("slack-shoot-upload-fail-")
    try {
      const one = join(dir, "one.txt")
      const two = join(dir, "two.txt")
      await writeFile(one, "one", "utf8")
      await writeFile(two, "two", "utf8")
      const result = await runCli(["send", "files", "--file", one, "--file", two], {
        env: {
          SLACK_SHOOT_CONFIG_DIR: dir,
          SLACK_SHOOT_TOKEN: "xoxb-test",
          SLACK_SHOOT_CHANNEL: "C123",
          SLACK_SHOOT_MOCK: "upload_second_fails"
        }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("one.txt succeeded")
      expect(result.stderr).toContain("two.txt failed")
    } finally {
      await removeDir(dir)
    }
  })
})
