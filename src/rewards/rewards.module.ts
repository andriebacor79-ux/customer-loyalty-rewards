import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { Reward } from "../entities";
import {
  CreateRewardDto,
  UpdateRewardDto,
  ListDto,
  page,
  rejectNulls,
} from "../dto";
import { Public, Roles } from "../common/security";
import {
  queueLowStock,
  queueRewardUpdates,
} from "../notifications/notifications.service";
@Injectable()
export class RewardsService {
  constructor(private db: DataSource) {}
  async list(q: ListDto) {
    const { page: pg, limit } = page(q);
    const b = this.db.getRepository(Reward).createQueryBuilder("r");
    if (q.rewardStatus)
      b.andWhere("r.rewardStatus=:status", { status: q.rewardStatus });
    if (q.search)
      b.andWhere("r.rewardName LIKE :term", { term: "%" + q.search + "%" });
    if (q.lowStock === "true") b.andWhere("r.stockQuantity <= r.reorderLevel");
    if (q.lowStock === "false") b.andWhere("r.stockQuantity > r.reorderLevel");
    const sorts: Record<string, string> = {
      rewardId: "r.rewardId",
      rewardName: "r.rewardName",
      pointsRequired: "r.pointsRequired",
      stockQuantity: "r.stockQuantity",
    };
    const [data, totalItems] = await b
      .orderBy(sorts[q.sortBy ?? "rewardId"], q.sortOrder ?? "ASC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
  async one(id: number) {
    const r = await this.db.getRepository(Reward).findOneBy({ rewardId: id });
    if (!r) throw new NotFoundException("Reward not found");
    return r;
  }
  async create(d: CreateRewardDto) {
    rejectNulls(d);
    return this.db.transaction(async (m) => {
      const r = await m.save(
        Reward,
        m.create(Reward, { ...d, description: d.description ?? null }),
      );
      await queueLowStock(m, r);
      await queueRewardUpdates(m, r);
      return r;
    });
  }
  async update(id: number, d: UpdateRewardDto, replace = false) {
    rejectNulls(d);
    return this.db.transaction(async (m) => {
      const r = await m.findOne(Reward, {
        where: { rewardId: id },
        lock: { mode: "pessimistic_write" },
      });
      if (!r) throw new NotFoundException("Reward not found");
      Object.assign(r, d);
      if (replace) r.description = d.description ?? null;
      await m.save(r);
      await queueLowStock(m, r);
      await queueRewardUpdates(m, r);
      return r;
    });
  }
  async remove(id: number) {
    await this.one(id);
    await this.db.getRepository(Reward).delete(id);
  }
}
@Controller("rewards")
export class RewardsController {
  constructor(private service: RewardsService) {}
  @Public() @Get() list(@Query() q: ListDto) {
    return this.service.list(q);
  }
  @Public() @Get(":id") one(@Param("id", ParseIntPipe) id: number) {
    return this.service.one(id);
  }
  @Roles("manager") @Post() create(@Body() d: CreateRewardDto) {
    return this.service.create(d);
  }
  @Roles("manager") @Put(":id") replace(
    @Param("id", ParseIntPipe) id: number,
    @Body() d: CreateRewardDto,
  ) {
    return this.service.update(id, d, true);
  }
  @Roles("manager") @Patch(":id") update(
    @Param("id", ParseIntPipe) id: number,
    @Body() d: UpdateRewardDto,
  ) {
    return this.service.update(id, d);
  }
  @Roles("manager") @Delete(":id") @HttpCode(204) remove(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.service.remove(id);
  }
}
@Module({ controllers: [RewardsController], providers: [RewardsService] })
export class RewardsModule {}
