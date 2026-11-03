/** An error that maps directly to an HTTP response the app can show. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'error',
  ) {
    super(message);
  }
}

/** A required setting (environment variable) is missing on the server. */
export class ConfigError extends Error {
  constructor(public setting: string) {
    super(`The server is missing the ${setting} setting.`);
  }
}
