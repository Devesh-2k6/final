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
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
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
  if (error instanceof Error) return error.message;
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
