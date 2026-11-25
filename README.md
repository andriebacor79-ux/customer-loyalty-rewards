# Customer Loyalty and Rewards Management System

Version 2.0: aligned with Andrie Bacor's ITEC 116 Activities 3-6 and the final-project requirements. Stack: NestJS 11, TypeORM 0.3, MySQL Community Server 8.4, JWT, bcryptjs and Postman. Seven entities, 27 REST endpoints. The customer and reward resources each provide complete CRUD. Frontend is optional and not included.

Start with START_HERE_TAGALOG.md. docs/LAB_ALIGNMENT.md records the mapping to each lab and explains the few necessary corrections to inconsistent lab examples.

## Requirements

Node.js 22 LTS or later, MySQL 8.4, Git, Postman. Optional: Python 3 with reportlab to regenerate the PDF, OpenSSL for a local HTTPS certificate, Mailpit or another SMTP capture server for an email demonstration. MySQL is the required target. XAMPP normally ships MariaDB, which is not the verified database for this package.

## Fresh setup (Windows or macOS/Linux)

Use a NEW database because the v1 schema is incompatible. This package never automatically drops or converts existing data.

In MySQL Workbench, as your local database administrator:

```sql
CREATE DATABASE loyalty_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'loyalty_app'@'127.0.0.1' IDENTIFIED BY '<choose your local password>';
GRANT ALL PRIVILEGES ON loyalty_v2.* TO 'loyalty_app'@'127.0.0.1';
```

Copy `.env.example` to `.env` (`copy .env.example .env` in Windows CMD, `cp .env.example .env` on macOS/Linux). Configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, MANAGER_EMAIL and MANAGER_PASSWORD. The password must be 12-72 ASCII characters. Generate a random JWT_SECRET with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then run inside the extracted project folder:

```sh
npm ci
npm run db:setup
npm run build
npm run start:dev
```

The API starts at http://localhost:3000/api/v1. `db:setup` explicitly synchronizes entities, adds database CHECK constraints and creates the first Manager only when that email does not already exist. Runtime schema synchronization is disabled. Setup is for a disposable development prototype, not a production migration strategy. Existing passwords are not reset by editing .env.

## MySQL schema

Customer, Employee, LoyaltyAccount, PointsTransaction, Reward, Redemption and EmailNotification use lab field names as physical column names, with camelCase JSON properties. A Customer owns exactly one LoyaltyAccount. Every redemption references one negative Redeem transaction; the transaction identifies the account and processing employee. Reward deletion and membership deletion are blocked when transaction history exists.

The lab's EmailNotification table is extended with nullable EmployeeID for manager low-stock alerts. Exactly one of CustomerID and EmployeeID is set. DateSent remains NULL until SMTP accepts the message. These choices are documented rather than claiming a pending email has already been sent.

## Login and permissions

POST /api/v1/auth/login accepts email and password. Optional accountType is `customer` or `employee`. Use it if the same email is registered in both independent account tables; ambiguous matches are rejected. JWT includes sub, type, role, email, iat and exp and expires after one hour. Roles in JWT/authorization are `customer`, `staff`, `manager`; Employee.Role stores `Staff` or `Manager` as in Activity 4. Current database identity/role is reloaded on protected requests.

Customer self-registration is public. Customers can read/update only their own profile and read only their own account, ledger, email history and redemptions. Staff/Managers manage loyalty transactions. Only Managers create employees, change reward definitions, suspend/reactivate accounts, delete unused customers/rewards, or read all delivery logs. Reward browsing is public, following the detailed Activity 5 specification.

Five failed login attempts within one minute per IP/email pair are allowed; further attempts receive 429. In-flight login attempts also reserve a slot. A separate general limiter allows 120 requests/minute/IP. Both limiters are in memory for the local prototype.

## Points and redemption rules

- Confirmed by the student: one point per PHP10, rounded down per purchase. PHP1500 earns 150 points. Database PurchaseAmount is DECIMAL(10,2), and the API accepts a numeric peso amount with at most two decimals. Internal calculation converts to centavos before division.
- An Earn request accepts purchaseAmount and forbids client-supplied points. Purchases below PHP10 do not create a ledger row because the lab forbids zero-point transactions.
- An Adjust request accepts nonzero signed integer points and no purchaseAmount. It cannot leave a negative balance. Staff/Manager permission follows Activity 5.
- Redeem entries can only be created through /redemptions. They deduct points and reserve one stock unit atomically.
- New redemptions are Pending. Staff/Managers can PATCH to Completed or Cancelled. Completed and Cancelled are terminal; repeating the same status is safe. Cancellation inserts a compensating Adjust row and restores stock exactly once. It uses the original ledger debit, even if reward point cost changed later.
- Suspended/Inactive accounts cannot earn, adjust or start redemptions. Existing pending redemptions can still be resolved to release reservations.
- No endpoint directly edits PointsBalance. Every balance change has a matching immutable ledger row. No idempotency key is implemented; after a lost response, inspect history before retrying a new transaction.

## Postman and automated tests

Import postman/Loyalty.postman_collection.json. Configure the local collection variables managerEmail and managerPassword. Run all 49 requests in order. The collection generates unique demo identities and captures IDs and separate role tokens automatically. Do not save or commit real passwords/tokens in a collection export.

With the server running and the same .env:

```sh
npm run test:e2e
```

Tests use synthetic accounts in your configured database. They cover all 27 routes, role checks, ownership, validation, stock/points concurrency, ledger history and the login failure threshold. Use a disposable database. Run the HTTP suite and collection separately or restart the API between runs to reset the demo rate limit.

Optional `npm run test:integration` runs the ledger/DB/SMTP/TLS checks against a disposable database after build. Start a separate HTTPS API on port3010 (or set TEST_HTTPS_URL) first. It uses its own ephemeral local SMTP capture server, creates a synthetic rejected recipient and does not send external email or disable passwords.

Captured results are in docs/verification.json, docs/newman-summary.json and docs/integration-summary.json. They describe actual automated runs, not student Postman GUI screenshots or a recorded video.

## Email preview and SMTP delivery

API requests write notifications as Pending in the same transaction as the business change. Sending is explicit, separate from the HTTP request, so SMTP failure cannot corrupt points/stock.

```sh
npm run mail:preview
```

Previews are written to ignored `.mail-preview/`. This sends nothing and leaves DeliveryStatus Pending.

For an inbox demonstration, run Mailpit locally (for example with Docker):

```sh
docker run --rm -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit
```

Set in .env:

```ini
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=demo@example.test
SMTP_SECURE=false
SMTP_ALLOW_INSECURE_LOCAL=true
```

Then run `npm run mail:dispatch` and inspect http://localhost:8025. Only a local capture server permits insecure SMTP. For a real SMTP provider, configure its host, TLS settings and credentials, leave SMTP_ALLOW_INSECURE_LOCAL=false and use authorized recipient addresses.

The dispatcher processes up to 100 Pending messages per invocation. Re-run to drain a larger queue. A database advisory lock prevents two dispatchers running simultaneously. SMTP acceptance sets Sent and DateSent; rejection sets Failed and keeps DateSent NULL. Sent means accepted by SMTP, not guaranteed final inbox delivery. Failed items remain recorded; after fixing the cause, a Manager/developer may explicitly reset selected Failed rows to Pending for retry. This prototype has no automatic retry scheduler or bounce webhook. A lost acknowledgement can cause a duplicate on manual retry, so it is not an exactly-once email system.

Low-stock messages go to Managers when a reward is created/edited at or below reorder level or a redemption reduces stock to that level. Customer messages cover account/profile changes, points changes and catalog/redemption updates.

## HTTPS

The local default is loopback HTTP for easy Postman setup. To demonstrate the TLS design from Activity 6, generate a local certificate:

```sh
mkdir .local-certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout .local-certs/key.pem -out .local-certs/cert.pem -days 30 -subj "/CN=localhost"
```

Set TLS_CERT_FILE=.local-certs/cert.pem and TLS_KEY_FILE=.local-certs/key.pem in .env and restart. Base URL becomes https://localhost:3000/api/v1. Trust the local certificate on your machine or disable certificate verification only for this local self-signed demonstration. Use a trusted certificate and proper reverse-proxy/client-IP configuration for a real deployment. Certificate/private-key files are excluded from the ZIP and Git.

## SQL import/export

Recommended: use an empty loyalty_v2, run db:setup and run the collection yourself.

Alternative: import database/loyalty_db.sql into an EMPTY loyalty_v2, then run db:setup. The bundled snapshot contains synthetic test history and disabled customer/employee passwords. Setup adds your local Manager because exported employee emails use audit identities. Register fresh customers and staff for login demos.

Export your own final demonstration database in MySQL Workbench: Server > Data Export > loyalty_v2 > Export to Self-Contained File. CLI alternative (prompts for the password):

```sh
mysqldump -h 127.0.0.1 -u loyalty_app -p --no-tablespaces --set-gtid-purged=OFF loyalty_v2 > database/loyalty_db.sql
```

Do not publish real customer data, real password hashes or credentials. The supplied SQL is a schema/test snapshot, not a conversion script for version 1.

## Submission and documentation

Documentation.pdf is an updated technical draft. Documentation.md is editable; regenerate using `python tools/render_docs.py` after `pip install reportlab`. Bundled DejaVu fonts include their license.

Your personal GitHub repository, at least five genuine meaningful development commits, narrated 5-10 minute video, actual Postman/database screenshots and live presentation remain student deliverables. No artificial commit history, GitHub URL, screenshots or video link is supplied. Read docs/SUBMISSION.md and docs/DEMO_SCRIPT.md. Add your actual links on the report cover before submission.

## Production limits

Single store, no frontend/POS/payment integration, no points expiry, no password-reset/refresh-token flow, no account recovery UI, no immutable stock movement ledger, no transaction idempotency key and no distributed rate limiter. Large customer broadcasts use a simple database queue; production would require batching/worker infrastructure, consent/preferences, retries and monitoring. Database migrations/backups and deployment hardening are future work.
