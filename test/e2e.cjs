const assert = require("node:assert/strict");
const fs = require("node:fs");
require("dotenv").config({ quiet: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000/api/v1";
const run = Date.now().toString();
const password = "Demo-" + require("node:crypto").randomUUID();
const results = [];
const covered = new Set();
let manager, staff, cToken, bToken;
async function call(
  method,
  path,
  body,
  status = 200,
  token = manager,
  label = path,
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;
  assert.equal(res.status, status, `${method} ${path}: ${raw}`);
  if (status >= 400) {
    assert.equal(data.success, false);
    assert.ok(data.timestamp);
    assert.ok(Array.isArray(data.errors));
  }
  results.push({ method, path, status, passed: true, label });
  covered.add(method + " " + path.split("?")[0].replace(/\/\d+/g, "/:id"));
  return data;
}
async function register(prefix) {
  return call(
    "POST",
    "/customers",
    {
      firstName: prefix,
      lastName: "Demo",
      email: `${prefix.toLowerCase()}-${run}@example.test`,
      password,
    },
    201,
    null,
  );
}
async function login(email, secret = password, type = "customer") {
  return (
    await call(
      "POST",
      "/auth/login",
      { email, password: secret, accountType: type },
      200,
      null,
    )
  ).access_token;
}
(async () => {
  await call("GET", "/customers", null, 401, null, "Missing JWT rejected");
  await call("GET", "/rewards", null, 200, null, "Public catalog");
  manager = await login(
    process.env.MANAGER_EMAIL,
    process.env.MANAGER_PASSWORD,
    "employee",
  );
  const profile = await call("GET", "/auth/me");
  assert.equal(profile.role, "manager");
  const jwtPayload = JSON.parse(
    Buffer.from(manager.split(".")[1], "base64url"),
  );
  assert.equal(jwtPayload.role, "manager");
  assert.equal(jwtPayload.exp - jwtPayload.iat, 3600);
  const employee = await call(
    "POST",
    "/employees",
    {
      firstName: "Test",
      lastName: "Cashier",
      email: `staff-${run}@example.test`,
      password,
      role: "Staff",
      dateHired: "2026-01-01",
    },
    201,
  );
  assert.equal(employee.passwordHash, undefined);
  staff = await login(employee.email, password, "employee");
  await call("GET", "/employees");
  await call("GET", "/employees", null, 403, staff);
  const c = await register("Member");
  const b = await register("Other");
  assert.equal(c.passwordHash, undefined);
  assert.ok(c.accountId);
  cToken = await login(c.email);
  bToken = await login(b.email);
  await call("GET", "/customers?search=Member&limit=5");
  await call("GET", `/customers/${c.customerId}`, null, 200, cToken);
  await call(
    "GET",
    `/customers/${b.customerId}`,
    null,
    403,
    cToken,
    "Customer cannot read other profile",
  );
  await call(
    "PATCH",
    `/customers/${b.customerId}`,
    { firstName: "Unauthorized" },
    403,
    cToken,
  );
  await call(
    "PATCH",
    `/customers/${c.customerId}`,
    { phoneNumber: "09123456789" },
    200,
    cToken,
  );
  await call(
    "PATCH",
    `/customers/${c.customerId}`,
    { passwordHash: "bad" },
    400,
    cToken,
  );
  await call(
    "PATCH",
    `/customers/${c.customerId}`,
    { firstName: null },
    400,
    cToken,
  );
  await call(
    "POST",
    "/customers",
    { firstName: "Bad", lastName: "Email", email: "invalid", password },
    400,
    null,
  );
  await call(
    "POST",
    "/customers",
    { firstName: "Duplicate", lastName: "Email", email: c.email, password },
    409,
    null,
  );
  await call("GET", "/customers", null, 403, cToken);
  await call("GET", "/loyalty-accounts?accountStatus=Active");
  await call("GET", `/loyalty-accounts/${c.accountId}`, null, 200, cToken);
  await call("GET", `/loyalty-accounts/${b.accountId}`, null, 403, cToken);
  await call(
    "PATCH",
    `/loyalty-accounts/${c.accountId}`,
    { accountStatus: "Suspended" },
    403,
    staff,
  );
  await call("PATCH", `/loyalty-accounts/${c.accountId}`, {
    accountStatus: "Suspended",
  });
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Earn", purchaseAmount: 1500 },
    409,
    staff,
  );
  await call("PATCH", `/loyalty-accounts/${c.accountId}`, {
    accountStatus: "Active",
  });
  const earn = await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Earn", purchaseAmount: 1500 },
    201,
    staff,
  );
  assert.equal(earn.points, 150);
  assert.equal(earn.purchaseAmount, 1500);
  await call(
    "GET",
    `/points-transactions/${earn.transactionId}`,
    null,
    200,
    cToken,
  );
  await call(
    "GET",
    `/points-transactions/${earn.transactionId}`,
    null,
    403,
    bToken,
  );
  await call(
    "GET",
    `/loyalty-accounts/${c.accountId}/points-transactions?transactionType=Earn`,
    null,
    200,
    cToken,
  );
  await call(
    "GET",
    `/loyalty-accounts/${c.accountId}/points-transactions`,
    null,
    403,
    bToken,
  );
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Adjust", points: 1 },
    403,
    cToken,
  );
  await call(
    "POST",
    "/points-transactions",
    {
      accountId: c.accountId,
      transactionType: "Earn",
      purchaseAmount: 1500,
      points: 999,
    },
    400,
    staff,
  );
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Redeem", points: -1 },
    400,
    staff,
  );
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Adjust", points: -151 },
    409,
    staff,
  );
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Adjust", points: 0 },
    400,
    staff,
  );
  const rewardBody = {
    rewardName: "Voucher " + run,
    description: "Demo",
    pointsRequired: 100,
    stockQuantity: 2,
    reorderLevel: 1,
    rewardStatus: "Available",
  };
  await call("POST", "/rewards", rewardBody, 403, staff);
  const reward = await call("POST", "/rewards", rewardBody, 201);
  await call(
    "GET",
    "/rewards?rewardStatus=Available&sortBy=pointsRequired&sortOrder=ASC&lowStock=false",
    null,
    200,
    null,
  );
  await call("GET", `/rewards/${reward.rewardId}`, null, 200, null);
  await call("PUT", `/rewards/${reward.rewardId}`, {
    ...rewardBody,
    description: "Replaced",
  });
  await call("PUT", `/rewards/${reward.rewardId}`, { stockQuantity: 3 }, 400);
  await call("PATCH", `/rewards/${reward.rewardId}`, { stockQuantity: 2 });
  await call(
    "POST",
    "/redemptions",
    { accountId: c.accountId, rewardId: reward.rewardId },
    403,
    cToken,
  );
  await call(
    "POST",
    "/redemptions",
    { accountId: b.accountId, rewardId: reward.rewardId },
    409,
    staff,
  );
  const redemption = await call(
    "POST",
    "/redemptions",
    { accountId: c.accountId, rewardId: reward.rewardId },
    201,
    staff,
  );
  assert.equal(redemption.redemptionStatus, "Pending");
  let balance = await call("GET", `/loyalty-accounts/${c.accountId}`);
  assert.equal(balance.pointsBalance, 50);
  const snapshot = await call(
    "GET",
    `/points-transactions/${redemption.transactionId}`,
  );
  assert.equal(snapshot.points, -100);
  await call(
    "GET",
    `/redemptions/${redemption.redemptionId}`,
    null,
    200,
    cToken,
  );
  await call(
    "GET",
    `/redemptions/${redemption.redemptionId}`,
    null,
    403,
    bToken,
  );
  const ownList = await call("GET", "/redemptions", null, 200, bToken);
  assert.equal(ownList.totalItems, 0);
  await call("GET", "/redemptions?redemptionStatus=Pending");
  await call(
    "GET",
    `/customers/${c.customerId}/email-notifications?notificationType=PointsUpdate`,
    null,
    200,
    cToken,
  );
  await call(
    "GET",
    `/customers/${c.customerId}/email-notifications`,
    null,
    403,
    bToken,
  );
  const low = await call("GET", "/email-notifications?deliveryStatus=Pending");
  assert.ok(
    low.data.some(
      (n) => n.employeeId === profile.id && n.subject === "Low reward stock",
    ),
  );
  await call("GET", "/email-notifications", null, 403, cToken);
  await call("PATCH", `/rewards/${reward.rewardId}`, { pointsRequired: 200 }); // Refund must retain original 100-point cost.
  await call(
    "PATCH",
    `/redemptions/${redemption.redemptionId}`,
    { redemptionStatus: "Cancelled" },
    200,
    staff,
  );
  await call(
    "PATCH",
    `/redemptions/${redemption.redemptionId}`,
    { redemptionStatus: "Cancelled" },
    200,
    staff,
  );
  balance = await call("GET", `/loyalty-accounts/${c.accountId}`);
  assert.equal(balance.pointsBalance, 150);
  let currentReward = await call("GET", `/rewards/${reward.rewardId}`);
  assert.equal(currentReward.stockQuantity, 2);
  await call(
    "POST",
    "/points-transactions",
    { accountId: c.accountId, transactionType: "Adjust", points: 50 },
    201,
    staff,
  );
  const completed = await call(
    "POST",
    "/redemptions",
    { accountId: c.accountId, rewardId: reward.rewardId },
    201,
    staff,
  );
  await call(
    "PATCH",
    `/redemptions/${completed.redemptionId}`,
    { redemptionStatus: "Completed" },
    200,
    staff,
  );
  await call(
    "PATCH",
    `/redemptions/${completed.redemptionId}`,
    { redemptionStatus: "Cancelled" },
    409,
    staff,
  );
  await call("DELETE", `/customers/${c.customerId}`, null, 409);
  await call("DELETE", `/rewards/${reward.rewardId}`, null, 409);
  const temp = await register("Temporary");
  await call("DELETE", `/customers/${temp.customerId}`, null, 403, staff);
  await call("DELETE", `/customers/${temp.customerId}`, null, 204);
  await call("GET", `/customers/${temp.customerId}`, null, 404);
  const tempReward = await call(
    "POST",
    "/rewards",
    { ...rewardBody, rewardName: "Temporary " + run },
    201,
  );
  await call("DELETE", `/rewards/${tempReward.rewardId}`, null, 204);
  await call("GET", "/customers?page=0", null, 400);
  await call("GET", "/rewards?sortBy=malicious", null, 400, null);
  await call("GET", "/loyalty-accounts", null, 401, "forged.jwt.token");
  // Two funded customers compete for the final stock unit.
  const a1 = await register("ConcurrentA");
  const a2 = await register("ConcurrentB");
  for (const a of [a1, a2])
    await call(
      "POST",
      "/points-transactions",
      { accountId: a.accountId, transactionType: "Earn", purchaseAmount: 10 },
      201,
      staff,
    );
  const limited = await call(
    "POST",
    "/rewards",
    {
      ...rewardBody,
      rewardName: "Limited " + run,
      pointsRequired: 1,
      stockQuantity: 1,
    },
    201,
  );
  async function parallelRedeem(ids) {
    const rs = await Promise.all(
      ids.map((accountId) =>
        fetch(base + "/redemptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${staff}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accountId, rewardId: limited.rewardId }),
        }),
      ),
    );
    assert.deepEqual(rs.map((x) => x.status).sort(), [201, 409]);
  }
  await parallelRedeem([a1.accountId, a2.accountId]);
  let last = await call("GET", `/rewards/${limited.rewardId}`);
  assert.equal(last.stockQuantity, 0);
  let aa = await call("GET", `/loyalty-accounts/${a1.accountId}`);
  let ab = await call("GET", `/loyalty-accounts/${a2.accountId}`);
  assert.equal(aa.pointsBalance + ab.pointsBalance, 1);
  results.push({
    label: "Concurrent last-stock redemption conserves points and stock",
    passed: true,
  });
  await call("PATCH", `/rewards/${limited.rewardId}`, { stockQuantity: 2 });
  await parallelRedeem([
    aa.pointsBalance ? a1.accountId : a2.accountId,
    aa.pointsBalance ? a1.accountId : a2.accountId,
  ]);
  results.push({
    label: "Same customer cannot spend one point twice concurrently",
    passed: true,
  });
  // Login failure threshold: five rejected credentials, then a 429.
  const failureEmail = `missing-${run}@example.test`;
  for (let i = 0; i < 5; i++)
    await call(
      "POST",
      "/auth/login",
      { email: failureEmail, password: "wrong-password" },
      401,
      null,
      "Failed login " + (i + 1),
    );
  await call(
    "POST",
    "/auth/login",
    { email: failureEmail, password: "wrong-password" },
    429,
    null,
    "Sixth failed-login attempt rate-limited",
  );
  const summary = {
    generatedAt: new Date().toISOString(),
    database: "MySQL 8.4.9 / InnoDB",
    httpChecks: results.filter((x) => x.method).length,
    scenarios: results.length,
    distinctEndpoints: covered.size,
    allPassed: true,
    results,
  };
  fs.writeFileSync("docs/verification.json", JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify({
      httpChecks: summary.httpChecks,
      scenarios: summary.scenarios,
      distinctEndpoints: covered.size,
      allPassed: true,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
