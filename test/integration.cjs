// Optional: run after build with a local HTTPS API on port 3010. Uses its own ephemeral SMTP capture server.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const cp = require("node:child_process");
const net = require("node:net");
const https = require("node:https");
const p = process.cwd();
require(p + "/node_modules/dotenv").config({ path: p + "/.env", quiet: true });
async function execute(script, env = {}) {
  return new Promise((resolve, reject) => {
    const c = cp.spawn(process.execPath, [script], {
      cwd: p,
      env: { ...process.env, ...env },
    });
    let out = "";
    c.stdout.on("data", (x) => (out += x));
    c.stderr.on("data", (x) => (out += x));
    c.on("exit", (code) => resolve({ code, out }));
    c.on("error", reject);
  });
}
(async () => {
  const db = await require(p + "/node_modules/mysql2/promise").createConnection(
    {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
  );
  const fixtureId = Date.now();
  const [recipient] = await db.query(
    "SELECT EmployeeID FROM Employee WHERE Role='Manager' LIMIT 1",
  );
  assert.ok(recipient.length, "Run db:setup first");
  await db.query(
    "INSERT INTO EmailNotification (CustomerID,EmployeeID,NotificationType,Subject,Message,DeliveryStatus) VALUES (NULL,?,'AccountUpdate','Local integration check','Synthetic local SMTP capture only','Pending')",
    [recipient[0].EmployeeID],
  );
  const [fixture] = await db.query(
    "INSERT INTO Reward (RewardName,PointsRequired,StockQuantity,ReorderLevel,RewardStatus) VALUES (?,1,1,0,'Unavailable')",
    [`Integration check ${fixtureId}`],
  );
  const [mismatch] = await db.query(
    "SELECT a.AccountID FROM LoyaltyAccount a LEFT JOIN PointsTransaction t ON t.AccountID=a.AccountID GROUP BY a.AccountID,a.PointsBalance HAVING a.PointsBalance <> COALESCE(SUM(t.Points),0)",
  );
  assert.equal(mismatch.length, 0);
  let rejected = false;
  try {
    await db.query("UPDATE Reward SET StockQuantity=-1 WHERE RewardID=?", [
      fixture.insertId,
    ]);
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true);
  const preview = await execute("dist/notifications/preview.js");
  assert.equal(preview.code, 0, preview.out);
  assert.ok(preview.out.includes("no email sent"));
  const [noSent] = await db.query(
    "SELECT COUNT(*) n FROM EmailNotification WHERE DeliveryStatus='Sent'",
  );
  const sentBefore = Number(noSent[0].n);
  let accepted = 0;
  const connections = new Set();
  const server = net.createServer((socket) => {
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
    socket.write("220 local-capture ESMTP\r\n");
    let buffer = "",
      dataMode = false;
    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (dataMode) {
          if (line === ".") {
            accepted++;
            dataMode = false;
            socket.write("250 Message accepted by local capture\r\n");
          }
          continue;
        }
        if (/^EHLO|^HELO/i.test(line))
          socket.write("250-local-capture\r\n250 SIZE 1000000\r\n");
        else if (/^MAIL FROM/i.test(line)) socket.write("250 Sender OK\r\n");
        else if (/^RCPT TO/i.test(line))
          socket.write(
            line.includes("reject-")
              ? "550 Test rejection\r\n"
              : "250 Recipient OK\r\n",
          );
        else if (/^DATA/i.test(line)) {
          dataMode = true;
          socket.write("354 End with dot\r\n");
        } else if (/^QUIT/i.test(line)) {
          socket.end("221 Bye\r\n");
        } else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const env = {
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(server.address().port),
    SMTP_SECURE: "false",
    SMTP_FROM: "demo@example.test",
    SMTP_ALLOW_INSECURE_LOCAL: "true",
  };
  let pending;
  do {
    const sent = await execute("dist/notifications/dispatch.js", env);
    assert.equal(sent.code, 0, sent.out);
    const [rows] = await db.query(
      "SELECT COUNT(*) n FROM EmailNotification WHERE DeliveryStatus='Pending'",
    );
    pending = Number(rows[0].n);
  } while (pending);
  const [sentRows] = await db.query(
    "SELECT COUNT(*) n FROM EmailNotification WHERE DeliveryStatus='Sent' AND DateSent IS NOT NULL",
  );
  assert.equal(Number(sentRows[0].n) - sentBefore, accepted);
  assert.ok(accepted > 0);
  const failureId = Date.now();
  const [employee] = await db.query(
    "INSERT INTO Employee (FirstName,LastName,Email,PasswordHash,Role,DateHired) VALUES ('Rejected','SMTP',?,'!DISABLED','Staff',CURRENT_DATE)",
    [`reject-${failureId}@example.test`],
  );
  await db.query(
    "INSERT INTO EmailNotification (CustomerID,EmployeeID,NotificationType,Subject,Message,DeliveryStatus) VALUES (NULL,?,'AccountUpdate','SMTP negative test','Synthetic test only','Pending')",
    [employee.insertId],
  );
  const failure = await execute("dist/notifications/dispatch.js", env);
  assert.equal(failure.code, 1);
  const [failed] = await db.query(
    "SELECT DeliveryStatus,DateSent FROM EmailNotification WHERE Subject='SMTP negative test' AND EmployeeID=?",
    [employee.insertId],
  );
  assert.equal(failed[0].DeliveryStatus, "Failed");
  assert.equal(failed[0].DateSent, null);
  for (const c of connections) c.destroy();
  await new Promise((resolve) => server.close(resolve));
  const secure = await new Promise((resolve, reject) => {
    https
      .get(
        process.env.TEST_HTTPS_URL || "https://127.0.0.1:3010/api/v1/rewards",
        { rejectUnauthorized: false },
        (res) => {
          let raw = "";
          res.on("data", (x) => (raw += x));
          res.on("end", () =>
            resolve({ status: res.statusCode, body: JSON.parse(raw) }),
          );
        },
      )
      .on("error", reject);
  });
  assert.equal(secure.status, 200);
  const summary = {
    generatedAt: new Date().toISOString(),
    ledgerReconciles: true,
    databaseRejectsNegativeStock: true,
    previewDoesNotSend: true,
    smtpAcceptedByLocalCapture: accepted,
    smtpFailureRecorded: true,
    httpsServed: true,
    externalEmailSent: false,
  };
  fs.writeFileSync(
    p + "/docs/integration-summary-latest.json",
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary));
  await db.end();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
