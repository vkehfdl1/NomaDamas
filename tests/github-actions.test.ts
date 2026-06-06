import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const readRepoFile = (path: string): Promise<string> => readFile(join(process.cwd(), path), "utf8")

describe("GitHub Actions CI/CD", () => {
  it("runs the full npm verification suite on pushes and pull requests", async () => {
    // Given: the repository is built as an npm-based TypeScript CLI.
    const workflow = await readRepoFile(".github/workflows/ci.yml")

    // When: GitHub evaluates the CI workflow.
    // Then: the workflow covers install, typecheck, tests, and build on supported Node versions.
    expect(workflow).toContain("pull_request:")
    expect(workflow).toContain("push:")
    expect(workflow).toMatch(/node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/)
    expect(workflow).toContain("npm ci")
    expect(workflow).toContain("npm run typecheck")
    expect(workflow).toContain("npm test")
    expect(workflow).toContain("npm run build")
  })

  it("publishes to npm only when a GitHub release is published", async () => {
    // Given: releases are the deployment surface for this CLI package.
    const workflow = await readRepoFile(".github/workflows/release.yml")

    // When: GitHub evaluates the release workflow.
    // Then: publishing is bound to release publication and uses npm provenance.
    expect(workflow).toMatch(/release:\s*\n\s+types:\s*\[published\]/)
    expect(workflow).toContain("id-token: write")
    expect(workflow).toContain("registry-url: https://registry.npmjs.org")
    expect(workflow).toContain("npm install -g npm@^11.5.1")
    expect(workflow).toContain("npm --version")
    expect(workflow).toContain("npm publish --provenance --access public")
    expect(workflow).not.toContain("pull_request:")
    expect(workflow).not.toContain("push:")
  })

  it("keeps the npm package publishable for release deployment", async () => {
    // Given: npm publish reads package metadata from package.json.
    const packageJson = JSON.parse(await readRepoFile("package.json")) as {
      readonly name?: string
      readonly private?: boolean
      readonly publishConfig?: { readonly registry?: string }
      readonly scripts?: Record<string, string>
    }

    // When: the release workflow runs npm publish.
    // Then: package metadata does not block public npm deployment.
    expect(packageJson.name).toBe("@vkehfdl1/shoot")
    expect(packageJson.private).not.toBe(true)
    expect(packageJson.publishConfig?.registry).toBe("https://registry.npmjs.org/")
    expect(packageJson.scripts?.["prepack"]).toBe("npm run build")
  })

  it("excludes compiler cache artifacts from the npm package allowlist", async () => {
    const packageJson = JSON.parse(await readRepoFile("package.json")) as {
      readonly files?: readonly string[]
    }

    expect(packageJson.files).toContain("dist/**/*.js")
    expect(packageJson.files).toContain("dist/**/*.d.ts")
    expect(packageJson.files).not.toContain("dist")
  })
})
