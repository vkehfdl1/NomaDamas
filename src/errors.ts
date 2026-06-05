export class CliError extends Error {
  readonly name: string = "CliError"

  constructor(
    message: string,
    readonly exitCode = 1
  ) {
    super(message)
  }
}

export class ConfigError extends CliError {
  readonly name = "ConfigError"
}

export class SlackError extends CliError {
  readonly name = "SlackError"
}

export class DiscordError extends CliError {
  readonly name = "DiscordError"
}

export class FileInputError extends CliError {
  readonly name = "FileInputError"
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof CliError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown error"
}
