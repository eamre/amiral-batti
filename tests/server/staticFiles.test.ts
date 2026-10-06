import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { serveStatic } from "../../src/server/staticFiles";

let outside: string;
let root: string;

beforeEach(async () => {
  outside = await mkdtemp(join(tmpdir(), "amiral-static-"));
  root = join(outside, "dist");
  await mkdir(join(root, "assets"), { recursive: true });
  await mkdir(join(root, "folder"));
  await writeFile(join(root, "index.html"), "<h1>Amiral</h1>");
  await writeFile(join(root, "assets", "app-1a2b3c.js"), "console.log(1);");
  await writeFile(join(root, "style.css"), "body{}");
  await writeFile(join(root, "notes.xyz"), "x");
  await writeFile(join(outside, "secret.txt"), "secret");
});

afterEach(async () => {
  await rm(outside, { recursive: true, force: true });
});

describe("serveStatic", () => {
  it("serves the page for the address of the site", async () => {
    const response = await serveStatic(root, "/");

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("<h1>Amiral</h1>");
    expect(response.headers["Content-Type"]).toBe("text/html; charset=utf-8");
  });

  it("serves a file with the type its extension tells", async () => {
    const script = await serveStatic(root, "/assets/app-1a2b3c.js");
    const style = await serveStatic(root, "/style.css");

    expect(script.headers["Content-Type"]).toBe("text/javascript; charset=utf-8");
    expect(style.headers["Content-Type"]).toBe("text/css; charset=utf-8");
    expect(script.body.toString()).toBe("console.log(1);");
  });

  it("serves a file of an unknown kind as plain bytes", async () => {
    const response = await serveStatic(root, "/notes.xyz");

    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe("application/octet-stream");
  });

  it("lets the browser keep the built files for good, since their names change with their content", async () => {
    const response = await serveStatic(root, "/assets/app-1a2b3c.js");

    expect(response.headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");
  });

  it("makes the browser ask again for the page, so a new version is seen", async () => {
    const response = await serveStatic(root, "/");

    expect(response.headers["Cache-Control"]).toBe("no-cache");
  });

  it("forbids the browser to guess another type for a file", async () => {
    const response = await serveStatic(root, "/style.css");

    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("answers 404 for a file that is not there", async () => {
    const response = await serveStatic(root, "/missing.js");

    expect(response.status).toBe(404);
  });

  it("answers 404 for a folder", async () => {
    const response = await serveStatic(root, "/folder");

    expect(response.status).toBe(404);
  });

  it("answers 404 when nothing was built", async () => {
    const response = await serveStatic(join(outside, "nothing"), "/");

    expect(response.status).toBe(404);
  });

  it("does not leave the folder with dots in the address", async () => {
    const response = await serveStatic(root, "/../secret.txt");

    expect(response.status).toBe(404);
  });

  it("does not leave the folder with dots that are written as %2e", async () => {
    const response = await serveStatic(root, "/%2e%2e/secret.txt");

    expect(response.status).toBe(404);
  });

  it("does not leave the folder with an encoded slash", async () => {
    const response = await serveStatic(root, "/..%2fsecret.txt");

    expect(response.status).toBe(404);
  });

  it("answers 404 for an address that cannot be read", async () => {
    const response = await serveStatic(root, "/%E0%A4%A");

    expect(response.status).toBe(404);
  });

  it("answers 404 for a null byte in the address", async () => {
    const response = await serveStatic(root, "/index.html%00.js");

    expect(response.status).toBe(404);
  });
});
