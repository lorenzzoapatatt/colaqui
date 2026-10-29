const sensitiveKey = /(password|token|secret|cookie|authorization)/i;

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redactSensitive(nestedValue),
    ]),
  );
}

export interface LogContext {
  [key: string]: unknown;
}

function redactContext(context: LogContext): LogContext {
  return redactSensitive(context) as LogContext;
}

export const logger = {
  info(message: string, context: LogContext = {}): void {
    console.info(JSON.stringify({ level: "info", message, ...redactContext(context) }));
  },
  error(message: string, context: LogContext = {}): void {
    console.error(JSON.stringify({ level: "error", message, ...redactContext(context) }));
  },
};
