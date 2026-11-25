# Mapping to Activities 3-6

The uploaded student labs, rather than the earlier simplified design, are the baseline for version 2. This file records implementation decisions and genuine discrepancies.

|Source|Lab design|Version 2 implementation|
|---|---|---|
|Activity 3, Part A|Customers, staff, managers; points and rewards; email notifications|Customer/Staff/Manager access, ledger, catalog/redemption and email queue/SMTP|
|Activity 3, Parts B-C|Application server, database, authentication and email service|NestJS modules, MySQL, JWT guard, separate SMTP dispatcher|
|Activity 4, Parts A-C|Seven entities and camelCase API mapping|Customer, LoyaltyAccount, Employee, PointsTransaction, Reward, Redemption, EmailNotification|
|Activity 4, Customer|First/last names, email/password, phone, birth date, date registered|Separate fields, bcrypt hash, optional phone/birth date, generated date|
|Activity 4, LoyaltyAccount|One account/customer; points >= 0; Active/Inactive/Suspended|Unique CustomerID, balance CHECK, status CHECK, manager PATCH|
|Activity 4, PointsTransaction|Earn/Redeem/Adjust, signed nonzero points, purchase decimal|Append-only ledger; server-calculated Earn, redemption-generated negative Redeem, signed Adjust|
|Activity 4, Reward|PointsRequired, StockQuantity, ReorderLevel, RewardStatus|Matching fields, validation, CHECKs, low-stock manager notifications|
|Activity 4, Redemption|TransactionID and RewardID foreign keys|Unique transaction link, one-unit stock reservation and state transitions|
|Activity 5, Part B|Versioned plural nouns, nesting, query parameters|/api/v1, customers, loyalty-accounts, points-transactions, rewards, redemptions, employees, email-notifications|
|Activity 5, Parts C-D|Customer/reward CRUD, account status/history, employee create/list, notifications|All planned resource operations plus authentication/current profile and a manager delivery-log list|
|Activity 5, Part D|Public customer signup and reward browsing|Public signup/catalog; protected personal data|
|Activity 5, Part E|PUT vs PATCH, standard errors and camelCase|PUT requires full editable reward definition; PATCH is partial; errors include success/statusCode/message/errors/timestamp|
|Activity 6, Parts A-B|Signed JWT, password hash, 401/403, RBAC, HTTPS, 5 failed logins/minute|JWT HS256, bcrypt cost12, database role reload, ownership checks, optional working TLS listener, failed-login limiter|

## Corrections and explicit extensions

1. Activity 4's handwritten entity summary puts RewardID in the PointsTransaction primary-key cell. Its ERD and detailed data dictionary identify TransactionID. The implementation follows TransactionID.
2. Activity 5's summary has several shifted descriptions/path spellings. The detailed cards and resource purposes govern the implementation. For example, GET account history reads history; POST points-transactions records Earn/Adjust.
3. Activity 5's detailed reward cards allow public browsing, while Activity 6 shows a reward GET as a generic protected-resource example. Version 2 follows the specific public catalog specification and demonstrates protection using accounts/customer data. Reward changes still require Manager.
4. The lab's email log only targets customers, but Activity 3 also requests low-stock alerts for authorized store users. EmployeeID is added as an optional recipient FK. Exactly one of CustomerID and EmployeeID must be set. This remains seven entities, not an eighth table.
5. DateSent is NULL for Pending/Failed notifications and is set only after SMTP acceptance. The lab declares it NOT NULL even while supporting Pending status; storing an unsent time as DateSent would be misleading.
6. Every new redemption reserves one reward unit and points in Pending state. PATCH can Complete or Cancel it. Cancellation appends an Adjust refund, preserves the original debit and restores stock once. Finalized states cannot switch to another final state.
7. Customer DELETE removes a genuinely unused membership and its notification records. Transaction history prevents deletion. Reward DELETE similarly preserves any redemption history.
8. The confirmed points rule is 1 point per PHP10 (PHP1500 = 150 points). It matches the Activity 5 example and the student's explicit confirmation. The earlier v1 sample PHP100 rule is removed.
9. Optional accountType disambiguates the lab's two independent login tables if the same email exists in Customer and Employee. JWT type distinguishes equal numeric IDs across those tables. Identity/role is reloaded from the database rather than trusting stale role claims alone.
10. The local default remains HTTP loopback for setup. A working optional HTTPS listener is included and tested. Deployment must actually configure trusted TLS; the package does not claim HTTP is encrypted.

## Final-project requirements

NestJS, TypeORM, MySQL and JWT remain the required stack. Customer and Reward are the two full CRUD modules. There are 27 method/path combinations, including GET, POST, PUT, PATCH and DELETE. SQL export, technical documentation, Postman collection, setup guide and Tagalog demo script are supplied. The student still provides their personal repository/history, video, screenshots and presentation.

## User-requested self-service extension

The deployed frontend now supports customers reserving their own rewards and cancelling their own pending requests. Employees still verify collection and complete requests. This intentionally extends the original staff-only redemption workflow. The seven-table model is retained; PointsTransaction.EmployeeID becomes nullable so a customer request is not falsely attributed to a staff member. Existing staff API requests remain compatible. See README.md for migration instructions. Earlier PDF and historical test artifacts describe the original workflow; use the current source and API.md for this extension.
