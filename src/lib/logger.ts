export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

interface LogEntry {
  domain: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

/**
 * Minimal structured logger: JSON lines in production (for log
 * aggregators/dashboards), readable single-line output in dev. Every
 * call site carries a domain tag (e.g. "odds-snapshot-recorder") so logs
 * can be filtered by which provider/service they came from - the
 * foundation for the "provider health" half of observability, even
 * though there's no dashboard reading these yet.
 */
function log(
  level: LogLevel,
  domain: string,
  message: string,
  fields?: LogFields,
): void {
  const entry: LogEntry & LogFields = {
    domain,
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(entry)
      : `[${entry.timestamp}] [${level}] [${domain}] ${message}${
          fields ? ` ${JSON.stringify(fields)}` : ""
        }`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  error: (domain: string, message: string, fields?: LogFields) =>
    log("error", domain, message, fields),
  info: (domain: string, message: string, fields?: LogFields) =>
    log("info", domain, message, fields),
  warn: (domain: string, message: string, fields?: LogFields) =>
    log("warn", domain, message, fields),
};

export function errorFields(error: unknown): LogFields {
  return { error: error instanceof Error ? error.message : String(error) };
}
