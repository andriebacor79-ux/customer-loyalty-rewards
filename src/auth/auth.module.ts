import {
  Module,
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  Injectable,
  UnauthorizedException,
  HttpException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import { Customer, Employee } from "../entities";
import { LoginDto } from "../dto";
import { Public } from "../common/security";
@Injectable()
export class AuthService {
  private failures = new Map<
    string,
    { count: number; inFlight: number; until: number }
  >();
  constructor(
    private db: DataSource,
    private jwt: JwtService,
  ) {}
  async login(d: LoginDto, ip: string) {
    // Five failed attempts per rolling lock window for each IP/email pair. Successful login does not count as failure.
    const email = d.email.toLowerCase();
    const key = ip + "|" + email;
    const now = Date.now();
    const previous = this.failures.get(key);
    if (previous && previous.until <= now) this.failures.delete(key);
    const entry = this.failures.get(key) ?? {
      count: 0,
      inFlight: 0,
      until: now + 60000,
    };
    if (entry.count + entry.inFlight >= 5)
      throw new HttpException(
        "Too many failed login attempts; try again after one minute",
        429,
      );
    if (this.failures.size > 10000)
      for (const [k, v] of this.failures)
        if (v.until <= now) this.failures.delete(k);
    entry.inFlight++;
    this.failures.set(key, entry);
    try {
      const candidates: any[] = [];
      if (d.accountType !== "employee") {
        const c = await this.db
          .getRepository(Customer)
          .createQueryBuilder("c")
          .addSelect("c.passwordHash")
          .where("c.email=:email", { email })
          .getOne();
        if (c && (await compare(d.password, c.passwordHash)))
          candidates.push({
            id: c.customerId,
            type: "customer",
            role: "customer",
            email: c.email,
          });
      }
      if (d.accountType !== "customer") {
        const e = await this.db
          .getRepository(Employee)
          .createQueryBuilder("e")
          .addSelect("e.passwordHash")
          .where("e.email=:email", { email })
          .getOne();
        if (e && (await compare(d.password, e.passwordHash)))
          candidates.push({
            id: e.employeeId,
            type: "employee",
            role: e.role.toLowerCase(),
            email: e.email,
          });
      }
      if (candidates.length !== 1) {
        entry.count++;
        throw new UnauthorizedException("Invalid email or password");
      }
      entry.count = 0;
      const actor = candidates[0];
      return {
        access_token: await this.jwt.signAsync({
          sub: actor.id,
          type: actor.type,
          role: actor.role,
          email: actor.email,
        }),
        token_type: "Bearer",
        expires_in: 3600,
        user: actor,
      };
    } finally {
      entry.inFlight--;
      if (entry.count === 0 && entry.inFlight === 0) this.failures.delete(key);
    }
  }
}
@Controller("auth")
class AuthController {
  constructor(private service: AuthService) {}
  @Public() @Post("login") @HttpCode(200) login(
    @Body() d: LoginDto,
    @Req() req: any,
  ) {
    return this.service.login(d, req.ip);
  }
  @Get("me") me(@Req() req: any) {
    return req.user;
  }
}
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
