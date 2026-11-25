import {
  IsEmail,
  IsString,
  Length,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsIn,
  Matches,
  IsDateString,
  IsNumber,
  ValidateIf,
} from "class-validator";
import { PartialType, PickType } from "@nestjs/mapped-types";
export class LoginDto {
  @IsEmail() @Length(3, 100) email!: string;
  @IsString() @Length(1, 72) password!: string;
  @IsOptional() @IsIn(["customer", "employee"]) accountType?:
    | "customer"
    | "employee";
}
export class CreateCustomerDto {
  @IsString() @Length(1, 50) @Matches(/\S/) firstName!: string;
  @IsString() @Length(1, 50) @Matches(/\S/) lastName!: string;
  @IsEmail() @Length(3, 100) email!: string;
  @IsString() @Length(12, 72) @Matches(/^[\x20-\x7E]+$/) password!: string;
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/)
  @Length(7, 15)
  phoneNumber?: string;
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;
}
export class UpdateCustomerDto {
  @IsOptional() @IsString() @Length(1, 50) @Matches(/\S/) firstName?: string;
  @IsOptional() @IsString() @Length(1, 50) @Matches(/\S/) lastName?: string;
  @IsOptional() @IsEmail() @Length(3, 100) email?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/)
  @Length(7, 15)
  phoneNumber?: string;
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;
}
export class CreateEmployeeDto extends PickType(CreateCustomerDto, [
  "firstName",
  "lastName",
  "email",
  "password",
] as const) {
  @IsIn(["Staff", "Manager"]) role!: "Staff" | "Manager";
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateHired!: string;
}
export class CreateRewardDto {
  @IsString() @Length(1, 100) @Matches(/\S/) rewardName!: string;
  @IsOptional() @IsString() @Length(0, 255) description?: string;
  @IsInt() @Min(1) @Max(1000000) pointsRequired!: number;
  @IsInt() @Min(0) @Max(1000000) stockQuantity!: number;
  @IsInt() @Min(0) @Max(1000000) reorderLevel!: number;
  @IsIn(["Available", "Unavailable"]) rewardStatus!:
    | "Available"
    | "Unavailable";
}
export class UpdateRewardDto extends PartialType(CreateRewardDto) {}
export class AccountStatusDto {
  @IsIn(["Active", "Inactive", "Suspended"]) accountStatus!:
    | "Active"
    | "Inactive"
    | "Suspended";
}
export class CreatePointsDto {
  @IsInt() @Min(1) accountId!: number;
  @IsIn(["Earn", "Adjust"]) transactionType!: "Earn" | "Adjust";
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(99999999.99)
  purchaseAmount?: number;
  @IsOptional() @IsInt() @Min(-1000000) @Max(1000000) points?: number;
}
export class CreateRedemptionDto {
  @IsInt() @Min(1) accountId!: number;
  @IsInt() @Min(1) rewardId!: number;
}
export class RedemptionStatusDto {
  @IsIn(["Completed", "Cancelled"]) redemptionStatus!:
    | "Completed"
    | "Cancelled";
}
export class ListDto {
  @IsOptional() @Matches(/^[1-9][0-9]{0,5}$/) page?: string;
  @IsOptional() @Matches(/^(?:[1-9]|[1-9][0-9]|100)$/) limit?: string;
  @IsOptional() @IsString() @Length(1, 100) search?: string;
  @IsOptional() @IsEmail() @Length(3, 100) email?: string;
  @IsOptional()
  @IsIn(["Active", "Inactive", "Suspended"])
  accountStatus?: string;
  @IsOptional() @IsIn(["Available", "Unavailable"]) rewardStatus?: string;
  @IsOptional() @IsIn(["Earn", "Redeem", "Adjust"]) transactionType?: string;
  @IsOptional()
  @IsIn(["PointsUpdate", "RewardUpdate", "AccountUpdate"])
  notificationType?: string;
  @IsOptional() @IsIn(["Pending", "Sent", "Failed"]) deliveryStatus?: string;
  @IsOptional()
  @IsIn(["Pending", "Completed", "Cancelled"])
  redemptionStatus?: string;
  @IsOptional() @IsIn(["true", "false"]) lowStock?: string;
  @IsOptional()
  @IsIn(["rewardId", "rewardName", "pointsRequired", "stockQuantity"])
  sortBy?: string;
  @IsOptional() @IsIn(["ASC", "DESC"]) sortOrder?: "ASC" | "DESC";
}
export function page(q: ListDto) {
  return { page: Number(q.page ?? 1), limit: Number(q.limit ?? 10) };
}
export function rejectNulls(d: object) {
  if (Object.values(d).some((x) => x === null))
    throw new (require("@nestjs/common").BadRequestException)(
      "Null values are not accepted in request bodies",
    );
}
