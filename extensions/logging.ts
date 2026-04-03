const PREFIX = "[pied-pi]";

export function log(event: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const payload = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`${PREFIX} ${timestamp} ${event}${payload}`);
}
