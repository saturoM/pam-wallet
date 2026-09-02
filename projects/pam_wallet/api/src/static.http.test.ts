import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import { createPamApp } from "./app";

describe("desk static", () => {
  let app: INestApplication;
  let base = "";
  const prev = process.env.WEB_DIST;

  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), "pam-web-"));
    writeFileSync(join(dir, "index.html"), "<html>pam-desk</html>");
    process.env.WEB_DIST = dir;
    app = await createPamApp({ logger: false });
    await app.listen(0, "127.0.0.1");
    const addr = app.getHttpServer().address();
    if (!addr || typeof addr === "string") throw new Error("no listen address");
    base = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await app.close();
    if (prev === undefined) delete process.env.WEB_DIST;
    else process.env.WEB_DIST = prev;
  });

  it("serves the desk and still answers /api", async () => {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /pam-desk/);
    const exam = await fetch(`${base}/#/exam`);
    assert.equal(exam.status, 200);
    const desk = await fetch(`${base}/api/desk`);
    assert.equal(desk.status, 200);
    assert.equal((await desk.json() as { booksOk?: boolean }).booksOk, true);
  });
});
