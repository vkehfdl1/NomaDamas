import { spawn } from "node:child_process"

const child = spawn("node", ["dist/cli.js", "__qa-live"], {
  cwd: new URL("..", import.meta.url),
  env: process.env,
  stdio: "inherit"
})

child.on("close", (code) => {
  process.exitCode = code ?? 1
})
