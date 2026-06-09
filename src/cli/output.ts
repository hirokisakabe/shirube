export type Format = "table" | "json";

export function writeData(data: unknown, format: Format): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(data)}\n`);
  } else {
    const rows = Array.isArray(data) ? data : [data];
    for (const row of rows) {
      if (typeof row === "object" && row !== null) {
        process.stdout.write(
          `${Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\t")}\n`,
        );
      } else {
        process.stdout.write(`${String(row)}\n`);
      }
    }
  }
}

export function writeError(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

export function writeLog(message: string): void {
  process.stderr.write(`${message}\n`);
}
