# Perkwise deployment

The same Node service hosts the React frontend and NestJS API. MySQL 8.4 is required and must be provisioned separately with a persistent volume and backups. Do not reuse the old v1 database or expose your Windows MySQL server publicly.

## Render

1. Connect `andriebacor79-ux/customer-loyalty-rewards` to the intended Render account.
2. Use Node, free web service, build `npm ci --include=dev && npm --prefix web ci --include=dev && npm run build`, start `node tools/start.mjs`, health check `/api/v1/health`.
3. Set `NODE_VERSION=22.16.0`, `NODE_ENV=production`, `HOST=0.0.0.0`. Render supplies PORT and trusted HTTPS.
4. Set a random JWT_SECRET (48 random bytes), DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD. Remote MySQL: `DB_SSL=true` with DB_CA_CERT if required. Certificate verification remains enabled.
5. Configure MANAGER_EMAIL/PASSWORD, STAFF_EMAIL/PASSWORD, CUSTOMER_EMAIL/PASSWORD. All app passwords must be distinct, random, 12–72 ASCII characters. Do not use your Gmail passwords. The email mapping is manager194, staff79 and customerbebek as in `.env.example`/render.yaml.
6. Set `INIT_DATABASE=true` for the fresh dedicated database. Startup creates the seven-table schema only if none of those tables exists, refuses a partial schema, and seeds missing role accounts. It never resets an existing password. After the first successful deployment, set `INIT_DATABASE=false`.
7. Leave SMTP unset until a real authorized mail provider is configured. A Pending queue entry is not proof of delivery. Mailpit on a laptop cannot receive mail from a cloud server via localhost.
8. Verify health, sign in as all three roles, record a purchase, reserve/cancel a reward, and check customer isolation.

Free service limits can cause cold starts or downtime. No paid plan, card entry or paid database is authorized by this repository. Verify provider pricing before provisioning. The frontend does not include Google OAuth or password reset.
