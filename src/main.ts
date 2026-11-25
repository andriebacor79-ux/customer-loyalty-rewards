import "reflect-metadata";
import "dotenv/config";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { NestExpressApplication } from "@nestjs/platform-express";
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
  const app = await NestFactory.create<NestExpressApplication>(
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
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? (process.env.RENDER ? 1 : 0)));
  const webRoot = join(__dirname, '../web/dist');
  if (existsSync(join(webRoot, 'index.html'))) {
    app.useStaticAssets(webRoot, { index: false });
    app.getHttpAdapter().getInstance().get('/{*splat}', (req:any,res:any,next:any)=>{
      if(req.path.startsWith('/api/'))return next();
      res.setHeader('Cache-Control','no-cache');res.sendFile(join(webRoot,'index.html'));
    });
  }

  await app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? (process.env.RENDER ? "0.0.0.0" : "127.0.0.1"));
  console.log(
    `Loyalty v2 ready at ${cert ? "https" : "http"}://localhost:${process.env.PORT ?? 3000}/api/v1`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
