import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  Query,
  Injectable,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { hash } from "bcryptjs";
import { Employee } from "../entities";
import { CreateEmployeeDto, ListDto, page, rejectNulls } from "../dto";
import { Roles } from "../common/security";
@Injectable()
class EmployeesService {
  constructor(private db: DataSource) {}
  async list(q: ListDto) {
    const { page: pg, limit } = page(q);
    const [data, totalItems] = await this.db
      .getRepository(Employee)
      .findAndCount({
        skip: (pg - 1) * limit,
        take: limit,
        order: { employeeId: "DESC" },
      });
    return { page: pg, limit, totalItems, data };
  }
  async create(d: CreateEmployeeDto) {
    rejectNulls(d);
    const e = await this.db
      .getRepository(Employee)
      .save({
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email.toLowerCase(),
        passwordHash: await hash(d.password, 12),
        role: d.role,
        dateHired: d.dateHired,
      });
    const { passwordHash: _, ...safe } = e;
    return safe;
  }
}
@Roles("manager")
@Controller("employees")
class EmployeesController {
  constructor(private service: EmployeesService) {}
  @Get() list(@Query() q: ListDto) {
    return this.service.list(q);
  }
  @Post() create(@Body() d: CreateEmployeeDto) {
    return this.service.create(d);
  }
}
@Module({ controllers: [EmployeesController], providers: [EmployeesService] })
export class EmployeesModule {}
