import "reflect-metadata";
import "dotenv/config";
import { readFileSync } from "node:fs";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { rejectNulls } from "./dto";
import { ApiExceptionFilter } from "./common/response";
async function main() {
  const cert = process.env.TLS_CERT_FILE,
    key = process.env.TLS_KEY_FILE;
  if (Boolean(cert) !== Boolean(key))
    throw new Error("Configure both TLS_CERT_FILE and TLS_KEY_FILE");
  const app = await NestFactory.create(
    AppModule,
    cert && key
      ? { httpsOptions: { cert: readFileSync(cert), key: readFileSync(key) } }
      : {},
  );
  app.use(helmet());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    {
      transform: (value: any, metadata: any) => {
        if (metadata.type === "body" && value && typeof value === "object")
          rejectNulls(value);
        return value;
      },
    },
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), "127.0.0.1");
  console.log(
    `Loyalty v2 ready at ${cert ? "https" : "http"}://localhost:${process.env.PORT ?? 3000}/api/v1`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
