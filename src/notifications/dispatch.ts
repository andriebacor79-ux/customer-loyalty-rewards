import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import nodemailer from "nodemailer";
import { databaseOptions } from "../database";
import { Customer, Employee, EmailNotification } from "../entities";
async function dispatch() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error("Configure SMTP_HOST and SMTP_FROM first. No emails sent.");
  if (
    process.env.SMTP_ALLOW_INSECURE_LOCAL === "true" &&
    !["localhost", "127.0.0.1", "::1"].includes(process.env.SMTP_HOST)
  )
    throw new Error("Insecure SMTP is allowed only for a local capture server");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_ALLOW_INSECURE_LOCAL !== "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });
  const db = await new DataSource(databaseOptions()).initialize();
  let sent = 0,
    failed = 0;
  const lock = db.createQueryRunner();
  await lock.connect();
  try {
    const acquired = await lock.query(
      "SELECT GET_LOCK(CONCAT(DATABASE(),':mail-dispatch'),0) AS acquired",
    );
    if (Number(acquired[0].acquired) !== 1)
      throw new Error("Another email dispatcher is running");
    // One local worker at a time. A lost acknowledgement can still cause an at-least-once delivery on manual retry.
    const rows = await db
      .getRepository(EmailNotification)
      .find({
        where: { deliveryStatus: "Pending" },
        order: { notificationId: "ASC" },
        take: 100,
      });
    for (const row of rows) {
      const recipient =
        row.customerId !== null
          ? await db
              .getRepository(Customer)
              .findOneBy({ customerId: row.customerId })
          : await db
              .getRepository(Employee)
              .findOneBy({ employeeId: row.employeeId! });
      try {
        if (!recipient) throw new Error("Notification recipient unavailable");
        await transport.sendMail({
          from: process.env.SMTP_FROM,
          to: recipient.email,
          subject: row.subject,
          text: row.message,
        });
        await db
          .getRepository(EmailNotification)
          .update(row.notificationId, {
            deliveryStatus: "Sent",
            dateSent: new Date(),
          });
        sent++;
      } catch {
        await db
          .getRepository(EmailNotification)
          .update(row.notificationId, {
            deliveryStatus: "Failed",
            dateSent: null,
          });
        failed++;
      }
    }
    console.log(
      JSON.stringify({ sent, failed, pendingBatchSize: rows.length }),
    );
  } finally {
    await lock.query(
      "SELECT RELEASE_LOCK(CONCAT(DATABASE(),':mail-dispatch'))",
    );
    await lock.release();
    await db.destroy();
    transport.close();
  }
  if (failed) process.exitCode = 1;
}
dispatch().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
