import "dotenv/config";
import { DataSourceOptions } from "typeorm";
import { entities } from "./entities";
export function databaseOptions(): DataSourceOptions {
  const database = process.env.DB_NAME ?? "loyalty_v2";
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error("Invalid DB_NAME");
  return {
    type: "mysql",
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    entities,
    ...(process.env.DB_SSL === "true" ? {ssl: {rejectUnauthorized: true, ...(process.env.DB_CA_CERT ? {ca: process.env.DB_CA_CERT.replace(/\\n/g,"\n")} : {})}} : {}),
    synchronize: false,
    charset: "utf8mb4",
    timezone: "Z",
  };
}
