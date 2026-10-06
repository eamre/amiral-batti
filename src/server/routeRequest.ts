import { serveStatic, type StaticResponse } from "./staticFiles";

const HEALTH_PATH = "/healthz";
const ANSWERED_METHODS = ["GET", "HEAD"];
// Only used to read the address: a request line holds a path, and a path needs a host to be an address.
const ANY_HOST = "http://localhost";

/**
 * What the server answers to a plain HTTP request: that it is alive, or a file of the built site.
 * The WebSocket does not come here; it is a different kind of request.
 */
export async function routeRequest(
  siteFolder: string,
  method: string | undefined,
  url: string | undefined,
): Promise<StaticResponse> {
  if (url === HEALTH_PATH) {
    return text(200, "ok");
  }
  if (method === undefined || !ANSWERED_METHODS.includes(method)) {
    return { ...text(405, "Method not allowed"), headers: { Allow: ANSWERED_METHODS.join(", ") } };
  }

  const path = pathOf(url ?? "/");
  return path === undefined ? text(400, "Bad request") : serveStatic(siteFolder, path);
}

function pathOf(url: string): string | undefined {
  try {
    return new URL(url, ANY_HOST).pathname;
  } catch {
    return undefined;
  }
}

function text(status: number, body: string): StaticResponse {
  return { status, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: Buffer.from(body) };
}
