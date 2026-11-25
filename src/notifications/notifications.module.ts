import { Module, Controller, Get, Query } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EmailNotification } from "../entities";
import { ListDto, page } from "../dto";
import { Roles } from "../common/security";
@Roles("manager")
@Controller("email-notifications")
class NotificationsController {
  constructor(private db: DataSource) {}
  @Get() async list(@Query() q: ListDto) {
    const { page: pg, limit } = page(q);
    const b = this.db.getRepository(EmailNotification).createQueryBuilder("n");
    if(q.search)b.andWhere('(n.subject LIKE :search OR n.message LIKE :search)',{search:'%'+q.search+'%'});
    if (q.deliveryStatus)
      b.andWhere("n.deliveryStatus=:status", { status: q.deliveryStatus });
    if (q.notificationType)
      b.andWhere("n.notificationType=:type", { type: q.notificationType });
    const [data, totalItems] = await b
      .orderBy("n.notificationId", "DESC")
      .skip((pg - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { page: pg, limit, totalItems, data };
  }
}
@Module({ controllers: [NotificationsController] })
export class NotificationsModule {}
