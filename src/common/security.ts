import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import { Customer, Employee } from "../entities";
export type Role = "customer" | "staff" | "manager";
export interface Actor {
  id: number;
  role: Role;
  email: string;
  type: "customer" | "employee";
}
export const Public = () => SetMetadata("public", true);
export const Roles = (...roles: Role[]) => SetMetadata("roles", roles);
export function ownCustomer(actor: Actor, id: number) {
  if (actor.role === "customer" && actor.id !== id)
    throw new ForbiddenException("You may access only your own records");
}
@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private db: DataSource,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride("public", [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    const req = ctx.switchToHttp().getRequest();
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
    if (!match) throw new UnauthorizedException("Bearer token required");
    let p: any;
    try {
      p = await this.jwt.verifyAsync(match[1], { algorithms: ["HS256"] });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    if (!Number.isInteger(p.sub) || !["customer", "employee"].includes(p.type))
      throw new UnauthorizedException();
    let actor: Actor;
    if (p.type === "customer") {
      const c = await this.db
        .getRepository(Customer)
        .findOneBy({ customerId: p.sub });
      if (!c) throw new UnauthorizedException();
      actor = {
        id: c.customerId,
        email: c.email,
        role: "customer",
        type: "customer",
      };
    } else {
      const e = await this.db
        .getRepository(Employee)
        .findOneBy({ employeeId: p.sub });
      if (!e) throw new UnauthorizedException();
      actor = {
        id: e.employeeId,
        email: e.email,
        role: e.role.toLowerCase() as Role,
        type: "employee",
      };
    }
    req.user = actor;
    const roles = this.reflector.getAllAndOverride<Role[]>("roles", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles && !roles.includes(actor.role))
      throw new ForbiddenException("Role not allowed");
    return true;
  }
}
