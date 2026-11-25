import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
  Relation,
} from "typeorm";
@Entity("Customer")
export class Customer {
  @PrimaryGeneratedColumn({ name: "CustomerID" }) customerId!: number;
  @Column({ name: "FirstName", length: 50 }) firstName!: string;
  @Column({ name: "LastName", length: 50 }) lastName!: string;
  @Column({ name: "Email", length: 100, unique: true }) email!: string;
  @Column({ name: "PasswordHash", length: 255, select: false })
  passwordHash!: string;
  @Column({ name: "PhoneNumber", type: "varchar", length: 15, nullable: true })
  phoneNumber!: string | null;
  @Column({ name: "BirthDate", type: "date", nullable: true }) birthDate!:
    | string
    | null;
  @Column({
    name: "DateRegistered",
    type: "date",
    default: () => "(CURRENT_DATE)",
  })
  dateRegistered!: string;
  @OneToOne(() => LoyaltyAccount, (a) => a.customer)
  account!: Relation<LoyaltyAccount>;
  @OneToMany(() => EmailNotification, (n) => n.customer)
  notifications!: EmailNotification[];
}
@Entity("Employee")
export class Employee {
  @PrimaryGeneratedColumn({ name: "EmployeeID" }) employeeId!: number;
  @Column({ name: "FirstName", length: 50 }) firstName!: string;
  @Column({ name: "LastName", length: 50 }) lastName!: string;
  @Column({ name: "Email", length: 100, unique: true }) email!: string;
  @Column({ name: "PasswordHash", length: 255, select: false })
  passwordHash!: string;
  @Column({ name: "Role", type: "varchar", length: 10 }) role!:
    | "Staff"
    | "Manager";
  @Column({ name: "DateHired", type: "date" }) dateHired!: string;
  @OneToMany(() => PointsTransaction, (t) => t.employee)
  transactions!: PointsTransaction[];
}
@Entity("LoyaltyAccount")
export class LoyaltyAccount {
  @PrimaryGeneratedColumn({ name: "AccountID" }) accountId!: number;
  @Column({ name: "CustomerID", unique: true }) customerId!: number;
  @OneToOne(() => Customer, (c) => c.account, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "CustomerID" })
  customer!: Customer;
  @Column({ name: "PointsBalance", type: "int", default: 0 })
  pointsBalance!: number;
  @Column({
    name: "AccountStatus",
    type: "varchar",
    length: 10,
    default: "Active",
  })
  accountStatus!: "Active" | "Inactive" | "Suspended";
  @Column({ name: "DateOpened", type: "date", default: () => "(CURRENT_DATE)" })
  dateOpened!: string;
  @OneToMany(() => PointsTransaction, (t) => t.account)
  transactions!: PointsTransaction[];
}
@Entity("PointsTransaction")
export class PointsTransaction {
  @PrimaryGeneratedColumn({ name: "TransactionID" }) transactionId!: number;
  @Column({ name: "AccountID" }) accountId!: number;
  @ManyToOne(() => LoyaltyAccount, (a) => a.transactions, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "AccountID" })
  account!: Relation<LoyaltyAccount>;
  @Column({ name: "EmployeeID", type: "int", nullable: true }) employeeId!: number | null;
  @ManyToOne(() => Employee, (e) => e.transactions, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "EmployeeID" })
  employee!: Employee | null;
  @Column({ name: "TransactionType", type: "varchar", length: 10 })
  transactionType!: "Earn" | "Redeem" | "Adjust";
  @Column({ name: "Points", type: "int" }) points!: number;
  @Column({
    name: "PurchaseAmount",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => (v === null ? null : v.toFixed(2)),
      from: (v: string | null) => (v === null ? null : Number(v)),
    },
  })
  purchaseAmount!: number | null;
  @CreateDateColumn({
    name: "TransactionDate",
    type: "datetime",
    precision: 0,
    default: () => "CURRENT_TIMESTAMP",
  })
  transactionDate!: Date;
  @OneToOne(() => Redemption, (r) => r.transaction)
  redemption!: Relation<Redemption>;
}
@Entity("Reward")
export class Reward {
  @PrimaryGeneratedColumn({ name: "RewardID" }) rewardId!: number;
  @Column({ name: "RewardName", length: 100, unique: true })
  rewardName!: string;
  @Column({ name: "Description", type: "varchar", length: 255, nullable: true })
  description!: string | null;
  @Column({ name: "PointsRequired", type: "int" }) pointsRequired!: number;
  @Column({ name: "StockQuantity", type: "int", default: 0 })
  stockQuantity!: number;
  @Column({ name: "ReorderLevel", type: "int", default: 5 })
  reorderLevel!: number;
  @Column({
    name: "RewardStatus",
    type: "varchar",
    length: 12,
    default: "Available",
  })
  rewardStatus!: "Available" | "Unavailable";
  @OneToMany(() => Redemption, (r) => r.reward) redemptions!: Redemption[];
}
@Entity("Redemption")
export class Redemption {
  @PrimaryGeneratedColumn({ name: "RedemptionID" }) redemptionId!: number;
  @Column({ name: "TransactionID", unique: true }) transactionId!: number;
  @OneToOne(() => PointsTransaction, (t) => t.redemption, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "TransactionID" })
  transaction!: PointsTransaction;
  @Column({ name: "RewardID" }) rewardId!: number;
  @ManyToOne(() => Reward, (r) => r.redemptions, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "RewardID" })
  reward!: Reward;
  @CreateDateColumn({
    name: "DateRedeemed",
    type: "datetime",
    precision: 0,
    default: () => "CURRENT_TIMESTAMP",
  })
  dateRedeemed!: Date;
  @Column({
    name: "RedemptionStatus",
    type: "varchar",
    length: 12,
    default: "Pending",
  })
  redemptionStatus!: "Pending" | "Completed" | "Cancelled";
}
@Entity("EmailNotification")
export class EmailNotification {
  @PrimaryGeneratedColumn({ name: "NotificationID" }) notificationId!: number;
  // EmployeeID extends the lab schema so low-stock alerts can reach authorized managers.
  @Column({ name: "CustomerID", type: "int", nullable: true }) customerId!:
    | number
    | null;
  @ManyToOne(() => Customer, (c) => c.notifications, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "CustomerID" })
  customer!: Customer | null;
  @Column({ name: "EmployeeID", type: "int", nullable: true }) employeeId!:
    | number
    | null;
  @ManyToOne(() => Employee, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "EmployeeID" })
  employee!: Employee | null;
  @Column({ name: "NotificationType", type: "varchar", length: 15 })
  notificationType!: "PointsUpdate" | "RewardUpdate" | "AccountUpdate";
  @Column({ name: "Subject", length: 100 }) subject!: string;
  @Column({ name: "Message", type: "text" }) message!: string;
  // Null until an SMTP server actually accepts delivery. Pending is never reported as Sent.
  @Column({ name: "DateSent", type: "datetime", nullable: true })
  dateSent!: Date | null;
  @Column({
    name: "DeliveryStatus",
    type: "varchar",
    length: 10,
    default: "Pending",
  })
  deliveryStatus!: "Pending" | "Sent" | "Failed";
}
export const entities = [
  Customer,
  Employee,
  LoyaltyAccount,
  PointsTransaction,
  Reward,
  Redemption,
  EmailNotification,
];
