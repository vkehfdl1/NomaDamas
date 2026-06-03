import { beforeAll, describe, expect, it } from "vitest"
import { buildCli, runCli } from "./helpers.js"

describe("CLI help", () => {
  beforeAll(async () => {
    const build = await buildCli()
    expect(`${build.stdout}\n${build.stderr}`).toContain("dist/cli.js")
    expect(build.exitCode).toBe(0)
  })

  it("prints core commands when help is requested", async () => {
    const result = await runCli(["--help"])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("login")
    expect(result.stdout).toContain("sync")
    expect(result.stdout).toContain("config")
    expect(result.stdout).toContain("send")
    expect(result.stdout).toContain("upload")
  })

  it("fails cleanly when an unknown command is requested", async () => {
    const result = await runCli(["nope"])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("Unknown command")
  })
})
