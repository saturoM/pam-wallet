import "reflect-metadata";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { NextFunction, Request, Response } from "express";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { LedgerExceptionFilter } from "./ledger.filter";

export function webDistDir(): string {
  if (process.env.WEB_DIST) return resolve(process.env.WEB_DIST);
  return resolve(join(__dirname, "..", "..", "web", "dist"));
}

export async function createPamApp(opts?: { logger?: boolean }) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: opts?.logger === false ? false : undefined,
  });
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalFilters(new LedgerExceptionFilter());
  const dist = webDistDir();
  if (existsSync(join(dist, "index.html"))) {
    app.useStaticAssets(dist);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api")) return next();
      res.sendFile(join(dist, "index.html"));
    });
  }
  return app;
}
