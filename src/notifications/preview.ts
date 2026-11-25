import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { mkdir, writeFile } from "node:fs/promises";
import { databaseOptions } from "../database";
import { EmailNotification, Customer, Employee } from "../entities";
async function preview() {
  const db = await new DataSource(databaseOptions()).initialize();
  try {
    await mkdir(".mail-preview", { recursive: true });
    const rows = await db
      .getRepository(EmailNotification)
      .find({
        where: { deliveryStatus: "Pending" },
        take: 100,
        order: { notificationId: "ASC" },
      });
    for (const n of rows) {
      const recipient =
        n.customerId !== null
          ? await db
              .getRepository(Customer)
              .findOneBy({ customerId: n.customerId })
          : await db
              .getRepository(Employee)
              .findOneBy({ employeeId: n.employeeId! });
      await writeFile(
        `.mail-preview/${n.notificationId}.txt`,
        `PREVIEW ONLY - NOT SENT\nTo: ${recipient?.email}\nSubject: ${n.subject}\n\n${n.message}\n`,
      );
    }
    console.log(
      `${rows.length} local previews generated. DeliveryStatus remains Pending; no email sent.`,
    );
  } finally {
    await db.destroy();
  }
}
preview().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
