import {
  Module,
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import {
  CreatePointsDto,
  CreateRedemptionDto,
  RedemptionStatusDto,
  ListDto,
} from "../dto";
import { Roles } from "../common/security";
@Controller("points-transactions")
class PointsController {
  constructor(private service: TransactionsService) {}
  @Roles("staff", "manager") @Post() create(
    @Body() d: CreatePointsDto,
    @Req() r: any,
  ) {
    return this.service.createPoints(d, r.user.id);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @Req() r: any) {
    return this.service.onePoints(id, r.user);
  }
}
@Controller("redemptions")
class RedemptionsController {
  constructor(private service: TransactionsService) {}
  @Get() list(@Query() q: ListDto, @Req() r: any) {
    return this.service.list(q, r.user);
  }
  @Roles("customer", "staff", "manager") @Post() create(
    @Body() d: CreateRedemptionDto,
    @Req() r: any,
  ) {
    return this.service.redeem(d, r.user);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @Req() r: any) {
    return this.service.redemption(id, r.user);
  }
  @Roles("customer", "staff", "manager") @Patch(":id") update(
    @Param("id", ParseIntPipe) id: number,
    @Body() d: RedemptionStatusDto,
    @Req() r: any,
  ) {
    return this.service.updateRedemption(id, d, r.user);
  }
}
@Module({
  controllers: [PointsController, RedemptionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
