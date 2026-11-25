# Tagalog demo script: 8-10 minutes

## 0:00-0:45 Start the backend

"Magandang araw. Ako si Andrie Bacor. Ito ang Customer Loyalty and Rewards Management System para sa retail store, na itinugma sa Activities 3 hanggang 6. NestJS, TypeORM at MySQL ang backend, at Postman ang client."

Show `npm run start:dev` without errors. Do not display .env passwords/private keys.

## 0:45-1:30 Login and JWT

POST /api/v1/auth/login using the local Manager. Show 200 and token capture. "Naka-hash ang password gamit ang bcrypt. Signed JWT ang ibinabalik, valid nang isang oras. Kasama ang account type para maiba ang Customer at Employee IDs."

## 1:30-3:15 Full customer CRUD

Public POST /customers creates a temporary customer and its loyalty account. GET the customer, PATCH the phone/name, DELETE as Manager, then GET again to show 404. Use a membership without points history so deletion succeeds.

"Hiwalay ang Customer profile sa LoyaltyAccount. Kapag may transaction history na, hindi na basta made-delete ang customer."

## 3:15-4:45 Trace the actual request layers

Open src/customers/customers.module.ts, then src/dto.ts, src/entities.ts and src/database.ts.

"Sa CustomersController pumapasok ang request. Chine-check ng global ValidationPipe ang DTO. CustomersService ang nag-aayos ng business operation. Sa registration, iisang MySQL transaction ang pag-save ng Customer, LoyaltyAccount at Pending EmailNotification. TypeORM ang nagma-map ng entity properties sa database columns. Bumabalik ang saved profile sa service, controller at Postman bilang JSON. Hindi ibinabalik ang password hash."

For protected requests, show src/common/security.ts and explain JWT validation, current role and ownership checks before controller access.

## 4:45-6:15 Earn, redeem and cancel

Register a demo customer. POST /points-transactions with transactionType Earn, purchaseAmount 1500 and accountId. Show 150 points. Create/select a 100-point reward. POST /redemptions as Staff/Manager. Show Pending, balance50 and stock reduced1. PATCH redemptionStatus Cancelled. Show balance150, stock restored and an Adjust row in the ledger.

"Confirmed ang 1 point kada PHP10. Naka-row-lock at nasa iisang transaction ang points, stock at history. Original debit ang basis ng refund at hindi nadodoble kapag inulit ang cancellation."

## 6:15-7:00 Protection and ownership

GET /loyalty-accounts without token returns401. Log in as Customer and try another customer's profile/account:403. Try a reward update as Staff:403.

"Authentication ang pag-check kung sino ka; authorization ang pag-check kung puwede ang action at kung sarili mong record iyon."

## 7:00-8:00 Database and email

In Workbench:
```sql
SELECT CustomerID,FirstName,LastName,Email FROM Customer;
SELECT AccountID,CustomerID,PointsBalance,AccountStatus FROM LoyaltyAccount;
SELECT TransactionID,AccountID,TransactionType,Points,PurchaseAmount FROM PointsTransaction;
SELECT RedemptionID,TransactionID,RewardID,RedemptionStatus FROM Redemption;
SELECT NotificationID,CustomerID,EmployeeID,DeliveryStatus,DateSent FROM EmailNotification;
```

Show matching IDs. Run `npm run mail:preview` and explain that previews are unsent. With local Mailpit configured, run `npm run mail:dispatch` and show the captured inbox and Sent logs. "SMTP acceptance lang ang ibig sabihin ng Sent; hindi ito garantiya ng final inbox delivery."

## 8:00-9:00 Security and close

If TLS is configured, show the HTTPS base URL. Explain five failed logins/minute per IP/email and show existing test evidence or demonstrate with a disposable identity. "Local HTTP ang default setup; TLS ang kailangang i-enable para sa encrypted transport."

"Naipakita ang authentication, CRUD, loyalty ledger, reward redemption, ownership at email flow. Single-store prototype ito. Wala pang frontend/POS integration, password recovery o points expiry. Maraming salamat."

# Presentation outline: 10-15 minutes plus Q&A

1. Problem, objectives and intended users:1 minute.
2. Architecture and integration layers:1.5 minutes.
3. Seven entities, PK/FK and CHECK constraints:2 minutes.
4. API resources, /api/v1 and methods/statuses:1 minute.
5. JWT, customer ownership, Staff/Manager and TLS:1.5 minutes.
6. Live Postman CRUD plus points/redemption:4 minutes.
7. Email demonstration, test evidence, limitations and conclusion:1.5 minutes.

# Q&A practice

**Bakit pitong tables?** Galing ito sa Activity4: hiwalay ang profile, account/balance, employee, ledger, reward, redemption at email log para malinaw ang responsibilities at relationships.

**Paano nagkakaroon ng account ang customer?** Public registration creates the customer and exactly one account atomically. Unique CustomerID sa LoyaltyAccount ang pumipigil sa duplicate membership.

**Bakit hindi puwedeng basta mag-edit ng pointsBalance?** Dapat may ledger record sa bawat dagdag o bawas. Earn, Redeem at Adjust ang controlled operations.

**Bakit decimal ang purchase amount?** DECIMAL(10,2) ang nasa Activity4 para sa peso values. Sa calculation, kino-convert muna sa integer centavos bago hatiin para sa points.

**Paano kung sabay ang redemption?** Account at reward rows ang naka-lock habang nasa transaction. Re-check ng susunod ang updated values. May tests para sa last stock at parehong points na sinusubukang gastusin nang sabay.

**Bakit may EmployeeID sa email table?** Kailangan ng low-stock email sa authorized manager sa Activity3. Customer-only ang original email schema, kaya may optional Employee recipient at CHECK na iisa lang ang recipient type.

**Bakit nullable ang DateSent?** Hindi pa sent ang Pending o Failed. Nilalagyan lang ng timestamp kapag tinanggap ng SMTP server.

**Bakit public ang reward GET?** Iyon ang specific access sa detailed Activity5 cards. Protected pa rin ang personal account data at Manager-only ang reward changes. Generic protected-resource example lang ang reward GET sa Activity6, kaya dokumentado ang reconciliation nito.

**Bakit iba ang case ng role sa JWT at database?** Staff/Manager ang database values ayon sa dictionary. Lowercase customer/staff/manager ang authorization/JWT convention; malinaw ang mapping sa service.

**Ano ang kailangan pa bago production?** Real deployment/TLS, migrations/backups, account recovery, distributed rate limiting, idempotency, email retry/bounce handling at scalable notification workers.
