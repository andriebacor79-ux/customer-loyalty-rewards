import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { hash } from "bcryptjs";
import { databaseOptions } from "./database";
import { Employee } from "./entities";
async function setup() {
  const email = process.env.MANAGER_EMAIL?.toLowerCase(),
    password = process.env.MANAGER_PASSWORD;
  if (
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 100 ||
    !password ||
    password.length < 12 ||
    password.length > 72 ||
    !/^[\x20-\x7E]+$/.test(password) ||
    password.startsWith("CHOOSE_")
  )
    throw new Error(
      "Set MANAGER_EMAIL and MANAGER_PASSWORD (12-72 ASCII characters)",
    );
  const db = await new DataSource(databaseOptions()).initialize();
  try {
    const legacy = await db.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','customers','rewards','purchases','redemptions')",
    );
    if (legacy.length)
      throw new Error(
        "V1 schema detected. Use a NEW empty database loyalty_v2; no destructive upgrade is performed.",
      );
    await db.synchronize();
    const checks: [string, string, string][] = [
      ["LoyaltyAccount", "chk_balance", "PointsBalance >= 0"],
      [
        "LoyaltyAccount",
        "chk_account_status",
        "AccountStatus IN ('Active','Inactive','Suspended')",
      ],
      ["Employee", "chk_employee_role", "Role IN ('Staff','Manager')"],
      ["PointsTransaction", "chk_points_nonzero", "Points <> 0"],
      [
        "PointsTransaction",
        "chk_transaction_type",
        "TransactionType IN ('Earn','Redeem','Adjust')",
      ],
      [
        "PointsTransaction",
        "chk_purchase_amount",
        "PurchaseAmount IS NULL OR PurchaseAmount >= 0",
      ],
      [
        "PointsTransaction",
        "chk_transaction_shape",
        "(TransactionType = 'Earn' AND Points > 0 AND PurchaseAmount IS NOT NULL) OR (TransactionType = 'Redeem' AND Points < 0 AND PurchaseAmount IS NULL) OR (TransactionType = 'Adjust' AND PurchaseAmount IS NULL)",
      ],
      ["Reward", "chk_reward_points", "PointsRequired > 0"],
      ["Reward", "chk_stock", "StockQuantity >= 0"],
      ["Reward", "chk_reorder", "ReorderLevel >= 0"],
      [
        "Reward",
        "chk_reward_status",
        "RewardStatus IN ('Available','Unavailable')",
      ],
      [
        "Redemption",
        "chk_redemption_status",
        "RedemptionStatus IN ('Pending','Completed','Cancelled')",
      ],
      [
        "EmailNotification",
        "chk_recipient",
        "(CustomerID IS NOT NULL AND EmployeeID IS NULL) OR (CustomerID IS NULL AND EmployeeID IS NOT NULL)",
      ],
      [
        "EmailNotification",
        "chk_notification_type",
        "NotificationType IN ('PointsUpdate','RewardUpdate','AccountUpdate')",
      ],
      [
        "EmailNotification",
        "chk_delivery_status",
        "DeliveryStatus IN ('Pending','Sent','Failed')",
      ],
      [
        "EmailNotification",
        "chk_date_sent",
        "(DeliveryStatus = 'Sent' AND DateSent IS NOT NULL) OR (DeliveryStatus <> 'Sent' AND DateSent IS NULL)",
      ],
    ];
    for (const [table, name, expr] of checks) {
      const exists = await db.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME=?",
        [name],
      );
      if (!exists.length)
        await db.query(
          `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expr})`,
        );
    }
    const repo = db.getRepository(Employee);
    if (!(await repo.existsBy({ email })))
      await repo.save(
        repo.create({
          firstName: "System",
          lastName: "Manager",
          email,
          passwordHash: await hash(password, 12),
          role: "Manager",
          dateHired: new Date().toISOString().slice(0, 10),
        }),
      );
    console.log(
      "Seven-table schema, CHECK constraints and initial Manager ready. Existing passwords are preserved.",
    );
  } finally {
    await db.destroy();
  }
}
setup().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
