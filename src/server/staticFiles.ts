import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

export interface StaticResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Buffer;
}

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const UNKNOWN_CONTENT_TYPE = "application/octet-stream";
const PAGE = "index.html";
const BUILT_FILES_FOLDER = "/assets/";
const KEEP_FOR_A_YEAR = "public, max-age=31536000, immutable";
const ASK_AGAIN = "no-cache";

/**
 * Answers a request for a file of the built site. Everything that is not a file inside `root`
 * (a missing file, a folder, a way out of the folder) gets the same 404, so the answer tells nothing.
 */
export async function serveStatic(root: string, urlPath: string): Promise<StaticResponse> {
  const file = fileFor(root, urlPath);
  if (file === undefined) {
    return notFound();
  }

  try {
    return found(file, urlPath, await readFile(file));
  } catch {
    // A file that is not there, a folder, a file that cannot be read, a name with a null byte: to the visitor they are all "not here".
    return notFound();
  }
}

/** The file an address points at, or undefined when the address is not a way into the folder. */
function fileFor(root: string, urlPath: string): string | undefined {
  const relative = decoded(urlPath === "/" ? `/${PAGE}` : urlPath);
  if (relative === undefined) {
    return undefined;
  }

  const folder = resolve(root);
  const file = resolve(join(folder, relative));
  return file.startsWith(folder + sep) ? file : undefined;
}

function decoded(urlPath: string): string | undefined {
  try {
    return decodeURIComponent(urlPath);
  } catch {
    return undefined;
  }
}

function found(file: string, urlPath: string, body: Buffer): StaticResponse {
  return {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[extname(file)] ?? UNKNOWN_CONTENT_TYPE,
      "Cache-Control": urlPath.startsWith(BUILT_FILES_FOLDER) ? KEEP_FOR_A_YEAR : ASK_AGAIN,
      "X-Content-Type-Options": "nosniff",
    },
    body,
  };
}

function notFound(): StaticResponse {
  return { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: Buffer.from("Not found") };
}
