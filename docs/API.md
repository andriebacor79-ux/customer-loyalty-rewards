# REST API reference

Base URL: `http://localhost:3000/api/v1` (or HTTPS after configuring TLS).

|Method|Path|Access|Success|
|---|---|---|---|
|POST|/auth/login|Public|200|
|GET|/auth/me|Authenticated|200|
|GET|/customers|Staff/Manager|200|
|POST|/customers|Public|201|
|GET|/customers/:id|Owner/Staff/Manager|200|
|PATCH|/customers/:id|Owner/Staff/Manager|200|
|DELETE|/customers/:id|Manager|204|
|GET|/customers/:id/email-notifications|Owner/Staff/Manager|200|
|GET|/employees|Manager|200|
|POST|/employees|Manager|201|
|GET|/loyalty-accounts|Staff/Manager|200|
|GET|/loyalty-accounts/:id|Owner/Staff/Manager|200|
|PATCH|/loyalty-accounts/:id|Manager|200|
|GET|/loyalty-accounts/:id/points-transactions|Owner/Staff/Manager|200|
|POST|/points-transactions|Staff/Manager|201|
|GET|/points-transactions/:id|Owner/Staff/Manager|200|
|GET|/rewards|Public|200|
|GET|/rewards/:id|Public|200|
|POST|/rewards|Manager|201|
|PUT|/rewards/:id|Manager|200|
|PATCH|/rewards/:id|Manager|200|
|DELETE|/rewards/:id|Manager|204|
|GET|/redemptions|Owner-scoped/Staff/Manager|200|
|POST|/redemptions|Staff/Manager|201|
|GET|/redemptions/:id|Owner/Staff/Manager|200|
|PATCH|/redemptions/:id|Staff/Manager|200|
|GET|/email-notifications|Manager|200|

Owner means the authenticated customer linked to the resource. Staff/Managers can read operational customer records. No endpoint returns passwordHash.

## Authentication

POST /auth/login body: `{"email":"...","password":"...","accountType":"customer"}` or accountType employee. accountType is optional unless email/password matches both account tables. 200 response: `{access_token,token_type:"Bearer",expires_in:3600,user:{id,type,role,email}}`. JWT payload contains sub, type, role, email, iat and exp. Send `Authorization: Bearer <token>` on protected calls.

## Customer and employee requests

POST /customers: `{firstName,lastName,email,password,phoneNumber?,birthDate?}`. Names <=50 characters; email <=100; password 12-72 ASCII characters; phone 7-15 digits with optional plus, max total length15; birthDate YYYY-MM-DD, no future date. Registration creates one Active loyalty account and an AccountUpdate notification atomically. Response includes customerId, safe profile/date fields and accountId.

PATCH /customers/:id: any subset of firstName,lastName,email,phoneNumber,birthDate. No passwordHash, accountId or pointsBalance edits. DELETE unused membership returns 204; a history-bearing customer returns 409.

POST /employees: `{firstName,lastName,email,password,role:"Staff"|"Manager",dateHired:"YYYY-MM-DD"}`. Response includes employeeId and safe employee fields. Both create and list require Manager. The initial Manager comes from local setup, not public registration.

## Accounts and points

GET /loyalty-accounts/:id: `{accountId,customerId,pointsBalance,accountStatus,dateOpened}`.
PATCH /loyalty-accounts/:id: `{"accountStatus":"Active"|"Inactive"|"Suspended"}`.

POST /points-transactions Earn example:
```json
{"accountId":1,"transactionType":"Earn","purchaseAmount":1500}
```
201: `{transactionId,accountId,employeeId,transactionType:"Earn",points:150,purchaseAmount:1500,transactionDate}`. 1 point/PHP10, rounded down. Reject client-supplied points for Earn. Purchase amount must be a positive peso number with at most two decimal places; at least PHP10 to generate nonzero points.

Adjust example:
```json
{"accountId":1,"transactionType":"Adjust","points":-5}
```
points must be nonzero integer, within +/-1,000,000; purchaseAmount must be omitted. Earn/Adjust cannot change an inactive/suspended account or create a negative balance. Redeem is accepted only through /redemptions, never as a manually supplied transaction type. Entries are immutable.

## Rewards

POST and PUT request fields: `{rewardName,description?,pointsRequired,stockQuantity,reorderLevel,rewardStatus}`. PUT requires every editable field except optional description, which resets to NULL when omitted. PATCH accepts any subset. Null values are rejected in request bodies. rewardStatus: Available/Unavailable. rewardName is unique and <=100 characters. description <=255. pointsRequired 1-1,000,000; stockQuantity/reorderLevel 0-1,000,000.

Response fields: `{rewardId,rewardName,description,pointsRequired,stockQuantity,reorderLevel,rewardStatus}`. Reward deletion with any redemption history returns 409.

## Redemptions

POST body: `{"accountId":1,"rewardId":1}`. Staff/Manager only. Atomically debits points, reserves one stock unit, inserts a negative Redeem ledger row and creates `{redemptionId,transactionId,rewardId,dateRedeemed,redemptionStatus:"Pending"}`.

PATCH body: `{"redemptionStatus":"Completed"}` or Cancelled. Pending can become either terminal status. Repeating the same status returns 200 without another debit/refund. Changing a terminal status to a different one returns 409. Cancellation uses the original ledger debit and appends a positive Adjust refund. GET list scopes a customer to their own redemptions; employees can read all.

## Lists and queries

All lists support `page=1&limit=10` (limit1-100) and return `{page,limit,totalItems,data:[...]}`. Customer list supports search by first/last name and exact email. Loyalty-account list supports accountStatus. Account history supports transactionType. Rewards support search, rewardStatus, lowStock=true/false, sortBy=rewardId|rewardName|pointsRequired|stockQuantity and sortOrder=ASC|DESC. Redemption list supports redemptionStatus. Notification lists support notificationType and deliveryStatus. Query input is validated; sorting uses a fixed allowlist.

## Email logs

EmailNotification fields: `{notificationId,customerId,employeeId,notificationType,subject,message,dateSent,deliveryStatus}`. notificationType: PointsUpdate/RewardUpdate/AccountUpdate. Exactly one recipient ID is present. DateSent is NULL until SMTP acceptance. DeliveryStatus: Pending/Sent/Failed. GET /customers/:id/email-notifications requires ownership or employee access. GET /email-notifications is Manager-only. Dispatch is an explicit CLI command, not an unprotected HTTP send endpoint.

## Standard errors

`{success:false,statusCode,message,errors:[...],timestamp:"ISO-8601"}`.

400 invalid DTO/query or invalid operation fields; 401 missing/invalid/expired JWT or bad login; 403 wrong role/other customer's resource; 404 missing record; 409 duplicate unique field, foreign-key/history restriction, insufficient points/stock, inactive account or forbidden status transition; 429 rate limit; 500 unexpected error with a sanitized response. Successful DELETE has no body.

### Self-service redemption extension

Customers can reserve their own rewards using POST /redemptions `{accountId,rewardId}`. Ownership is enforced inside the locked transaction. PATCH /redemptions/:id `{redemptionStatus:"Cancelled"}` is allowed for the owning customer; Completed remains employee-only. Other members' reservations are forbidden. Pending reservations debit the account and stock; cancellation credits the original debit exactly once. Display reference is PW- followed by redemptionId padded to six digits, and staff must verify the member identity when collecting. GET /dashboard/redemptions?search=PW-000001 lets staff find a reference.

PointsTransaction.EmployeeID is nullable for customer-initiated reservations/refunds. Staff collection attributes an unassigned Redeem transaction to the staff member. Existing staff-created records are preserved.
