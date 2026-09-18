export class ApiError extends Error {
  readonly status: number;

  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function formatFastApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object") {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? (item as { loc: unknown[] }).loc.filter((part) => part !== "body").join(" ")
            : "";
          const rawMsg = (item as { msg?: unknown }).msg ? String((item as { msg: unknown }).msg) : "";
          const msg = rawMsg.replace(/^Value error,\s*/i, "");
          if (loc && msg) {
            const cleanLoc = loc.replace(/_/g, " ");
            const formattedLoc = cleanLoc.charAt(0).toUpperCase() + cleanLoc.slice(1);
            return `${formattedLoc}: ${msg}`;
          }
          if (msg) return msg;
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "Unknown error";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "Unable to connect to the server. Please check your internet or if the backend is running.";
    }
    return error.message;
  }
  return "Something went wrong";
}

export function parseApiErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    if ("message" in body && typeof (body as { message: unknown }).message === "string") {
      return (body as { message: string }).message;
    }
    if ("detail" in body) {
      return formatFastApiDetail((body as { detail: unknown }).detail);
    }
  }
  return `Request failed (${status})`;
}
