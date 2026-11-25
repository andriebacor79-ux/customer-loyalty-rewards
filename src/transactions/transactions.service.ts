import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import {
  LoyaltyAccount,
  PointsTransaction,
  Reward,
  Redemption,
} from "../entities";
import {
  CreatePointsDto,
  CreateRedemptionDto,
  RedemptionStatusDto,
  ListDto,
  page,
} from "../dto";
import { Actor, ownCustomer } from "../common/security";
import {
  queueCustomer,
  queueLowStock,
} from "../notifications/notifications.service";
@Injectable()
export class TransactionsService {
  constructor(private db: DataSource) {}
  async lockAccount(m: EntityManager, id: number) {
    const a = await m.findOne(LoyaltyAccount, {
      where: { accountId: id },
      lock: { mode: "pessimistic_write" },
    });
    if (!a) throw new NotFoundException("Loyalty account not found");
    return a;
  }
  checkActive(a: LoyaltyAccount) {
    if (a.accountStatus !== "Active")
      throw new ConflictException("Loyalty account is not active");
  }
  checkBalance(balance: number) {
    if (balance < 0 || balance > 2000000000)
      throw new ConflictException(
        "Insufficient points or balance limit reached",
      );
  }
  async createPoints(d: CreatePointsDto, employeeId: number) {
    let points: number,
      amount: number | null = null;
    if (d.transactionType === "Earn") {
      if (
        d.purchaseAmount === undefined ||
        d.purchaseAmount <= 0 ||
        d.points !== undefined
      )
        throw new BadRequestException(
          "Earn requires a positive purchaseAmount and forbids client-supplied points",
        );
      const centavos = Math.round(d.purchaseAmount * 100);
      points = Math.floor(centavos / 1000); // Confirmed: 1 point per PHP10, rounded per transaction.
      if (points === 0)
        throw new BadRequestException(
          "Purchase must be at least PHP10 to create a nonzero points transaction",
        );
      amount = centavos / 100;
    } else {
      if (
        d.points === undefined ||
        d.points === 0 ||
        d.purchaseAmount !== undefined
      )
        throw new BadRequestException(
          "Adjust requires nonzero integer points and no purchaseAmount",
        );
      points = d.points;
    }
    return this.db.transaction(async (m) => {
      const a = await this.lockAccount(m, d.accountId);
      this.checkActive(a);
      this.checkBalance(a.pointsBalance + points);
      a.pointsBalance += points;
      await m.save(a);
      const row = await m.save(
        PointsTransaction,
        m.create(PointsTransaction, {
          accountId: a.accountId,
          employeeId,
          transactionType: d.transactionType,
          points,
          purchaseAmount: amount,
        }),
      );
      await queueCustomer(
        m,
        a.customerId,
        "PointsUpdate",
        "Loyalty points updated",
        `${d.transactionType}: ${points} points. Current balance: ${a.pointsBalance}.`,
      );
      return row;
    });
  }
  async onePoints(id: number, actor: Actor) {
    const t = await this.db
      .getRepository(PointsTransaction)
      .findOneBy({ transactionId: id });
    if (!t) throw new NotFoundException("Points transaction not found");
    const a = await this.db
      .getRepository(LoyaltyAccount)
      .findOneByOrFail({ accountId: t.accountId });
    ownCustomer(actor, a.customerId);
    return t;
  }
  async redeem(d: CreateRedemptionDto, employeeId: number) {
    return this.db.transaction(async (m) => {
      const a = await this.lockAccount(m, d.accountId);
      this.checkActive(a);
      const r = await m.findOne(Reward, {
        where: { rewardId: d.rewardId },
        lock: { mode: "pessimistic_write" },
      });
      if (!r) throw new NotFoundException("Reward not found");
      if (r.rewardStatus !== "Available" || r.stockQuantity < 1)
        throw new ConflictException("Reward unavailable");
      this.checkBalance(a.pointsBalance - r.pointsRequired);
      a.pointsBalance -= r.pointsRequired;
      r.stockQuantity--;
      await m.save(a);
      await m.save(r);
      const t = await m.save(
        PointsTransaction,
        m.create(PointsTransaction, {
          accountId: a.accountId,
          employeeId,
          transactionType: "Redeem",
          points: -r.pointsRequired,
          purchaseAmount: null,
        }),
      );
      const redemption = await m.save(
        Redemption,
        m.create(Redemption, {
          transactionId: t.transactionId,
          rewardId: r.rewardId,
          redemptionStatus: "Pending",
        }),
      );
      await queueCustomer(
        m,
        a.customerId,
        "PointsUpdate",
        "Reward redemption reserved",
        `${r.rewardName}: ${r.pointsRequired} points reserved. Balance: ${a.pointsBalance}.`,
      );
      await queueLowStock(m, r);
      return redemption;
    });
  }
  async redemption(id: number, actor: Actor) {
    const r = await this.db
      .getRepository(Redemption)
      .findOneBy({ redemptionId: id });
    if (!r) throw new NotFoundException("Redemption not found");
    await this.onePoints(r.transactionId, actor);
    return r;
  }
  async list(q: ListDto, actor: Actor) {
    const { page: pg, limit } = page(q);
    const b = this.db
      .getRepository(Redemption)
      .createQueryBuilder("r")
      .innerJoin("r.transaction", "t")
      .innerJoin("t.account", "a");
    if (actor.role === "customer")
      b.where("a.customerId=:customerId", { customerId: actor.id });
    if (q.redemptionStatus)
      b.andWhere("r.redemptionStatus=:status", { status: q.redemptionStatus });
    const [data, totalItems] = await b
      .orderBy("r.redemptionId", "DESC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
  async updateRedemption(
    id: number,
    d: RedemptionStatusDto,
    employeeId: number,
  ) {
    const initial = await this.db
      .getRepository(Redemption)
      .findOneBy({ redemptionId: id });
    if (!initial) throw new NotFoundException("Redemption not found");
    const t = await this.db
      .getRepository(PointsTransaction)
      .findOneByOrFail({ transactionId: initial.transactionId });
    return this.db.transaction(async (m) => {
      // Consistent order prevents double refunds and stock races: account -> reward -> redemption.
      const a = await this.lockAccount(m, t.accountId);
      const reward = await m.findOne(Reward, {
        where: { rewardId: initial.rewardId },
        lock: { mode: "pessimistic_write" },
      });
      if (!reward) throw new NotFoundException("Reward not found");
      const r = await m.findOne(Redemption, {
        where: { redemptionId: id },
        lock: { mode: "pessimistic_write" },
      });
      if (!r) throw new NotFoundException();
      if (r.redemptionStatus === d.redemptionStatus) return r;
      if (r.redemptionStatus !== "Pending")
        throw new ConflictException(
          "Only Pending redemptions may change status",
        );
      if (d.redemptionStatus === "Cancelled") {
        const refund = -t.points;
        this.checkBalance(a.pointsBalance + refund);
        if (reward.stockQuantity >= 2000000000)
          throw new ConflictException("Stock limit reached");
        a.pointsBalance += refund;
        reward.stockQuantity++;
        await m.save(a);
        await m.save(reward);
        await m.save(
          PointsTransaction,
          m.create(PointsTransaction, {
            accountId: a.accountId,
            employeeId,
            transactionType: "Adjust",
            points: refund,
            purchaseAmount: null,
          }),
        );
        await queueCustomer(
          m,
          a.customerId,
          "PointsUpdate",
          "Redemption cancelled",
          `${refund} points refunded for redemption ${id}. Balance: ${a.pointsBalance}.`,
        );
      } else
        await queueCustomer(
          m,
          a.customerId,
          "RewardUpdate",
          "Redemption completed",
          `Redemption ${id} was completed.`,
        );
      r.redemptionStatus = d.redemptionStatus;
      return m.save(r);
    });
  }
}
