import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { LedgerExceptionFilter } from "./ledger.filter";

export async function createPamApp(opts?: { logger?: boolean }) {
  const app = await NestFactory.create(AppModule, {
    logger: opts?.logger === false ? false : undefined,
  });
  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalFilters(new LedgerExceptionFilter());
  return app;
}
