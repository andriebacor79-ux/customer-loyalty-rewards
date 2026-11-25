import {
  Module,
  Injectable,
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { LoyaltyAccount, PointsTransaction } from "../entities";
import { AccountStatusDto, ListDto, page } from "../dto";
import { Actor, Roles, ownCustomer } from "../common/security";
import { queueCustomer } from "../notifications/notifications.service";
@Injectable()
export class AccountsService {
  constructor(private db: DataSource) {}
  async list(q: ListDto) {
    const { page: pg, limit } = page(q);
    const where = q.accountStatus
      ? { accountStatus: q.accountStatus as LoyaltyAccount["accountStatus"] }
      : {};
    const [data, totalItems] = await this.db
      .getRepository(LoyaltyAccount)
      .findAndCount({
        where,
        skip: (pg - 1) * limit,
        take: limit,
        order: { accountId: "DESC" },
      });
    return { page: pg, limit, totalItems, data };
  }
  async one(id: number, actor: Actor) {
    const a = await this.db
      .getRepository(LoyaltyAccount)
      .findOneBy({ accountId: id });
    if (!a) throw new NotFoundException("Loyalty account not found");
    ownCustomer(actor, a.customerId);
    return a;
  }
  async update(id: number, d: AccountStatusDto) {
    return this.db.transaction(async (m) => {
      const a = await m.findOne(LoyaltyAccount, {
        where: { accountId: id },
        lock: { mode: "pessimistic_write" },
      });
      if (!a) throw new NotFoundException("Loyalty account not found");
      a.accountStatus = d.accountStatus;
      await m.save(a);
      await queueCustomer(
        m,
        a.customerId,
        "AccountUpdate",
        "Loyalty account status updated",
        `Your account is now ${a.accountStatus}.`,
      );
      return a;
    });
  }
  async history(id: number, q: ListDto, actor: Actor) {
    await this.one(id, actor);
    const { page: pg, limit } = page(q);
    const b = this.db
      .getRepository(PointsTransaction)
      .createQueryBuilder("t")
      .where("t.accountId=:id", { id });
    if (q.transactionType)
      b.andWhere("t.transactionType=:type", { type: q.transactionType });
    const [data, totalItems] = await b
      .orderBy("t.transactionId", "DESC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
}
@Controller("loyalty-accounts")
class AccountsController {
  constructor(private service: AccountsService) {}
  @Roles("staff", "manager") @Get() list(@Query() q: ListDto) {
    return this.service.list(q);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @Req() r: any) {
    return this.service.one(id, r.user);
  }
  @Roles("manager") @Patch(":id") update(
    @Param("id", ParseIntPipe) id: number,
    @Body() d: AccountStatusDto,
  ) {
    return this.service.update(id, d);
  }
  @Get(":id/points-transactions") history(
    @Param("id", ParseIntPipe) id: number,
    @Query() q: ListDto,
    @Req() r: any,
  ) {
    return this.service.history(id, q, r.user);
  }
}
@Module({ controllers: [AccountsController], providers: [AccountsService] })
export class AccountsModule {}
