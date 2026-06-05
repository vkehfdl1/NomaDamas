import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, makeTempDir, removeDir, runCli } from "./helpers.js"

describe("Discord provider", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(build.exitCode).toBe(0)
  })

  it("sends a Discord message when provider is discord", async () => {
    const dir = await makeTempDir("shoot-discord-send-")
    try {
      const result = await runCli(["send", "discord qa", "--provider", "discord"], {
        env: {
          SHOOT_CONFIG_DIR: dir,
          SHOOT_DISCORD_TOKEN: "discord-test",
          SHOOT_DISCORD_CHANNEL: "987",
          SHOOT_DISCORD_MOCK: "send_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Message sent to discord:987")
    } finally {
      await removeDir(dir)
    }
  })

  it("uploads a Discord file when provider is discord", async () => {
    const dir = await makeTempDir("shoot-discord-upload-")
    try {
      const file = join(dir, "qa.txt")
      await writeFile(file, "discord file qa", "utf8")
      const result = await runCli(["upload", file, "--provider", "discord", "--message", "file qa"], {
        env: {
          SHOOT_CONFIG_DIR: dir,
          SHOOT_DISCORD_TOKEN: "discord-test",
          SHOOT_DISCORD_CHANNEL: "987",
          SHOOT_DISCORD_MOCK: "upload_ok"
        }
      })

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain("Uploaded qa.txt to discord:987")
    } finally {
      await removeDir(dir)
    }
  })

  it("fails before Discord call when channel is missing", async () => {
    const dir = await makeTempDir("shoot-discord-no-channel-")
    try {
      const result = await runCli(["send", "bad", "--provider", "discord"], {
        env: {
          SHOOT_CONFIG_DIR: dir,
          SHOOT_DISCORD_TOKEN: "discord-test",
          SHOOT_DISCORD_MOCK: "send_ok"
        }
      })

      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain("No Discord channel provided")
    } finally {
      await removeDir(dir)
    }
  })
})
