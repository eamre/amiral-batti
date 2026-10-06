import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { routeRequest } from "../../src/server/routeRequest";

let site: string;

beforeEach(async () => {
  site = await mkdtemp(join(tmpdir(), "amiral-route-"));
  await mkdir(join(site, "assets"));
  await writeFile(join(site, "index.html"), "<h1>Amiral</h1>");
  await writeFile(join(site, "style.css"), "body{}");
});

afterEach(async () => {
  await rm(site, { recursive: true, force: true });
});

describe("routeRequest", () => {
  it("tells that the server is alive", async () => {
    const response = await routeRequest(site, "GET", "/healthz");

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("ok");
  });

  it("tells that the server is alive even before the site was built", async () => {
    const response = await routeRequest(join(site, "nothing"), "GET", "/healthz");

    expect(response.status).toBe(200);
  });

  it("serves the page for the address of the site", async () => {
    const response = await routeRequest(site, "GET", "/");

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("<h1>Amiral</h1>");
  });

  it("serves the page when the request has no address at all", async () => {
    const response = await routeRequest(site, "GET", undefined);

    expect(response.status).toBe(200);
  });

  it("ignores what comes after the question mark", async () => {
    const response = await routeRequest(site, "GET", "/style.css?v=3");

    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe("text/css; charset=utf-8");
  });

  it("answers a HEAD request like a GET one", async () => {
    const response = await routeRequest(site, "HEAD", "/");

    expect(response.status).toBe(200);
  });

  it("refuses to change anything: only GET and HEAD are answered", async () => {
    const response = await routeRequest(site, "POST", "/");

    expect(response.status).toBe(405);
    expect(response.headers["Allow"]).toBe("GET, HEAD");
  });

  it("answers 404 for a file that is not there", async () => {
    const response = await routeRequest(site, "GET", "/missing.js");

    expect(response.status).toBe(404);
  });

  it("answers 400 for an address that cannot be read", async () => {
    const response = await routeRequest(site, "GET", "http://[");

    expect(response.status).toBe(400);
  });
});
