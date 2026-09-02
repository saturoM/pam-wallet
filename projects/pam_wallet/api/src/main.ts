import { createPamApp, webDistDir } from "./app";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function bootstrap() {
  const app = await createPamApp();
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, "0.0.0.0");
  const desk = existsSync(join(webDistDir(), "index.html"));
  console.log(
    desk
      ? `PAM desk http://localhost:${port}  exam http://localhost:${port}/#/exam`
      : `PAM API http://localhost:${port}/api/desk  (no web/dist — run npm run build --prefix web)`,
  );
}

void bootstrap();
