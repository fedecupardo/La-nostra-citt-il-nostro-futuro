import mysql from "mysql2/promise";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Usage: node scripts/promote-admin.mjs admin@example.com");
}

const pool = mysql.createPool({
  host: process.env.AIVEN_MYSQL_HOST,
  port: Number(process.env.AIVEN_MYSQL_PORT || 3306),
  database: process.env.AIVEN_MYSQL_DATABASE,
  user: process.env.AIVEN_MYSQL_USER,
  password: process.env.AIVEN_MYSQL_PASSWORD,
  ssl: process.env.AIVEN_MYSQL_SSL === "true"
    ? { rejectUnauthorized: process.env.AIVEN_MYSQL_SSL_VERIFY !== "false" }
    : undefined,
  connectionLimit: 1,
});

try {
  const [result] = await pool.execute(
    "UPDATE users SET role='admin', verification='verified' WHERE lower(email)=? AND verification<>'deleted'",
    [email],
  );
  if (!result.affectedRows) {
    throw new Error("Nessun profilo attivo trovato per questa email.");
  }
  console.log(`Profilo promosso ad amministratore: ${email}`);
} finally {
  await pool.end();
}
