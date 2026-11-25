import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { hash } from "bcryptjs";
import { Customer, LoyaltyAccount, EmailNotification } from "../entities";
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  ListDto,
  page,
  rejectNulls,
} from "../dto";
import { Actor, Public, Roles, ownCustomer } from "../common/security";
import { queueCustomer } from "../notifications/notifications.service";
@Injectable()
export class CustomersService {
  constructor(private db: DataSource) {}
  async list(q: ListDto) {
    const { page: pg, limit } = page(q);
    const b = this.db.getRepository(Customer).createQueryBuilder("c");
    if (q.search)
      b.andWhere("(c.firstName LIKE :term OR c.lastName LIKE :term)", {
        term: "%" + q.search + "%",
      });
    if (q.email) b.andWhere("c.email=:email", { email: q.email.toLowerCase() });
    const [data, totalItems] = await b
      .orderBy("c.customerId", "DESC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
  async one(id: number, actor: Actor) {
    ownCustomer(actor, id);
    const c = await this.db
      .getRepository(Customer)
      .findOneBy({ customerId: id });
    if (!c) throw new NotFoundException("Customer not found");
    return c;
  }
  async create(d: CreateCustomerDto) {
    rejectNulls(d);
    if (d.birthDate && d.birthDate > new Date().toISOString().slice(0, 10))
      throw new BadRequestException("Birth date cannot be in the future");
    const passwordHash = await hash(d.password, 12);
    return this.db.transaction(async (m) => {
      const c = await m.save(
        Customer,
        m.create(Customer, {
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email.toLowerCase(),
          passwordHash,
          phoneNumber: d.phoneNumber ?? null,
          birthDate: d.birthDate ?? null,
        }),
      );
      const a = await m.save(
        LoyaltyAccount,
        m.create(LoyaltyAccount, {
          customerId: c.customerId,
          pointsBalance: 0,
          accountStatus: "Active",
        }),
      );
      await queueCustomer(
        m,
        c.customerId,
        "AccountUpdate",
        "Welcome to the loyalty program",
        "Your loyalty account is active.",
      );
      const { passwordHash: _, ...safe } = c;
      return { ...safe, accountId: a.accountId };
    });
  }
  async update(id: number, d: UpdateCustomerDto, actor: Actor) {
    rejectNulls(d);
    await this.one(id, actor);
    if (d.birthDate && d.birthDate > new Date().toISOString().slice(0, 10))
      throw new BadRequestException("Birth date cannot be in the future");
    return this.db.transaction(async (m) => {
      if (Object.keys(d).length)
        await m.update(Customer, id, {
          ...d,
          ...(d.email ? { email: d.email.toLowerCase() } : {}),
        });
      await queueCustomer(
        m,
        id,
        "AccountUpdate",
        "Customer profile updated",
        "Your customer profile details were updated.",
      );
      return m.findOneByOrFail(Customer, { customerId: id });
    });
  }
  async remove(id: number) {
    return this.db.transaction(async (m) => {
      const c = await m.findOne(Customer, {
        where: { customerId: id },
        lock: { mode: "pessimistic_write" },
      });
      if (!c) throw new NotFoundException("Customer not found");
      const account = await m.findOneBy(LoyaltyAccount, { customerId: id });
      // History-bearing accounts cannot be deleted. Unused memberships and their queued emails are removable.
      if (account) {
        const rows = await m.query(
          "SELECT TransactionID FROM PointsTransaction WHERE AccountID=? LIMIT 1",
          [account.accountId],
        );
        if (rows.length)
          throw new ConflictException("Customer has transaction history");
        await m.delete(LoyaltyAccount, { accountId: account.accountId });
      }
      await m.delete(EmailNotification, { customerId: id });
      await m.delete(Customer, { customerId: id });
    });
  }
  async notifications(id: number, q: ListDto, actor: Actor) {
    await this.one(id, actor);
    const { page: pg, limit } = page(q);
    const b = this.db
      .getRepository(EmailNotification)
      .createQueryBuilder("n")
      .where("n.customerId=:id", { id });
    if (q.notificationType)
      b.andWhere("n.notificationType=:type", { type: q.notificationType });
    if (q.deliveryStatus)
      b.andWhere("n.deliveryStatus=:status", { status: q.deliveryStatus });
    const [data, totalItems] = await b
      .orderBy("n.notificationId", "DESC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
}
@Controller("customers")
export class CustomersController {
  constructor(private service: CustomersService) {}
  @Roles("staff", "manager") @Get() list(@Query() q: ListDto) {
    return this.service.list(q);
  }
  @Public() @Post() create(@Body() d: CreateCustomerDto) {
    return this.service.create(d);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @Req() r: any) {
    return this.service.one(id, r.user);
  }
  @Patch(":id") update(
    @Param("id", ParseIntPipe) id: number,
    @Body() d: UpdateCustomerDto,
    @Req() r: any,
  ) {
    return this.service.update(id, d, r.user);
  }
  @Roles("manager") @Delete(":id") @HttpCode(204) remove(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.service.remove(id);
  }
  @Get(":id/email-notifications") notifications(
    @Param("id", ParseIntPipe) id: number,
    @Query() q: ListDto,
    @Req() r: any,
  ) {
    return this.service.notifications(id, q, r.user);
  }
}
@Module({ controllers: [CustomersController], providers: [CustomersService] })
export class CustomersModule {}
