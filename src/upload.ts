import { access, stat } from "node:fs/promises"
import { basename } from "node:path"
import { createDiscordClient } from "./discord.js"
import { CliError, FileInputError, formatUnknownError } from "./errors.js"
import { createSlackClient } from "./slack.js"

async function existingFile(path: string): Promise<void> {
  try {
    const info = await stat(path)
    if (!info.isFile()) {
      throw new FileInputError(`File not found: ${path}`)
    }
    await access(path)
  } catch (error) {
    if (error instanceof FileInputError) {
      throw error
    }
    throw new FileInputError(`File not found: ${path}`)
  }
}

export async function uploadSlackFiles(input: {
  readonly token: string
  readonly channel: string
  readonly files: readonly string[]
  readonly message?: string
}): Promise<void> {
  const slack = createSlackClient()
  const succeeded: string[] = []
  for (let index = 0; index < input.files.length; index += 1) {
    const filePath = input.files[index]
    if (filePath === undefined) {
      continue
    }
    await existingFile(filePath)
    try {
      const result = await slack.uploadFile({
        token: input.token,
        channel: input.channel,
        filePath,
        uploadIndex: index,
        ...(input.message === undefined ? {} : { message: input.message })
      })
      succeeded.push(result.filename)
      process.stdout.write(`Uploaded ${result.filename} to ${result.channel} (${result.order})\n`)
    } catch (error) {
      const prior = succeeded.length > 0 ? `${succeeded.join(", ")} succeeded; ` : ""
      throw new CliError(`${prior}${basename(filePath)} failed: ${formatUnknownError(error)}`)
    }
  }
}

export async function uploadDiscordFiles(input: {
  readonly token: string
  readonly channel: string
  readonly files: readonly string[]
  readonly message?: string
}): Promise<void> {
  const discord = createDiscordClient()
  for (const filePath of input.files) {
    await existingFile(filePath)
    const result = await discord.uploadFile({
      token: input.token,
      channel: input.channel,
      filePath,
      ...(input.message === undefined ? {} : { message: input.message })
    })
    process.stdout.write(`Uploaded ${result.filename} to discord:${result.channel}\n`)
  }
}
