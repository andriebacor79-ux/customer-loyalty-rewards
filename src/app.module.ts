import { DashboardModule } from "./dashboard/dashboard.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { databaseOptions } from "./database";
import { SecurityGuard } from "./common/security";
import { AuthModule } from "./auth/auth.module";
import { CustomersModule } from "./customers/customers.module";
import { EmployeesModule } from "./employees/employees.module";
import { RewardsModule } from "./rewards/rewards.module";
import { AccountsModule } from "./accounts/accounts.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { NotificationsModule } from "./notifications/notifications.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: databaseOptions }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32 || secret.startsWith("REPLACE_"))
          throw new Error("Set a random JWT_SECRET of at least 32 characters");
        return { secret, signOptions: { algorithm: "HS256", expiresIn: "1h" } };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    DashboardModule,
    AuthModule,
    CustomersModule,
    EmployeesModule,
    RewardsModule,
    AccountsModule,
    TransactionsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SecurityGuard },
  ],
})
export class AppModule {}
