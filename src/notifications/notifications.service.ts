import { Injectable } from "@nestjs/common";
import { EntityManager, DataSource } from "typeorm";
import { EmailNotification, Customer, Employee, Reward } from "../entities";
export async function queueCustomer(
  m: EntityManager,
  customerId: number,
  notificationType: EmailNotification["notificationType"],
  subject: string,
  message: string,
) {
  return m.save(
    EmailNotification,
    m.create(EmailNotification, {
      customerId,
      employeeId: null,
      notificationType,
      subject,
      message,
      dateSent: null,
      deliveryStatus: "Pending",
    }),
  );
}
export async function queueLowStock(m: EntityManager, reward: Reward) {
  if (reward.stockQuantity > reward.reorderLevel) return;
  const managers = await m.findBy(Employee, { role: "Manager" });
  for (const manager of managers)
    await m.save(
      EmailNotification,
      m.create(EmailNotification, {
        customerId: null,
        employeeId: manager.employeeId,
        notificationType: "RewardUpdate",
        subject: "Low reward stock",
        message: `${reward.rewardName}: ${reward.stockQuantity} units remain; reorder level ${reward.reorderLevel}.`,
        dateSent: null,
        deliveryStatus: "Pending",
      }),
    );
}
export async function queueRewardUpdates(m: EntityManager, reward: Reward) {
  const customers = await m.find(Customer);
  for (const c of customers)
    await queueCustomer(
      m,
      c.customerId,
      "RewardUpdate",
      "Reward catalog updated",
      `${reward.rewardName} now requires ${reward.pointsRequired} points and is ${reward.rewardStatus}.`,
    );
}
