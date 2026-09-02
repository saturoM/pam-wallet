import { createPamApp } from "./app";

async function bootstrap() {
  const app = await createPamApp();
  await app.listen(3001);
  console.log("PAM API http://localhost:3001/api/desk");
}

void bootstrap();
