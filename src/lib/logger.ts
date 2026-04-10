type Context = Record<string, unknown>;

export function logInfo(message: string, context?: Context) {
  console.info(`[fogatta] ${message}`, context ?? {});
}

export function logWarn(message: string, context?: Context) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[fogatta] ${message}`, context ?? {});
  }
}

export function logError(message: string, context?: Context) {
  console.error(`[fogatta] ${message}`, context ?? {});
}
