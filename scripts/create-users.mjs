import { createHash, randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
    }
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const [adminEmail, adminPassword, userEmail, userPassword] = process.argv
  .slice(2)
  .map((value) => value?.trim());

if (!adminEmail || !adminPassword || !userEmail || !userPassword) {
  throw new Error(
    "Uso: node scripts/create-users.mjs admin@email.it passwordAdmin user@email.it passwordUtente",
  );
}

if (adminEmail.toLowerCase() === userEmail.toLowerCase()) {
  throw new Error("Le email devono essere diverse.");
}

function validateEmail(value) {
  if (!/^\S+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
    throw new Error(`Email non valida: ${value}`);
  }
}

function validatePassword(value) {
  if (value.length < 12 || value.length > 128) {
    throw new Error("Le password devono contenere da 12 a 128 caratteri.");
  }
}

validateEmail(adminEmail);
validateEmail(userEmail);
validatePassword(adminPassword);
validatePassword(userPassword);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function createCredential(password) {
  const salt = randomBytes(32).toString("hex");
  return {
    salt,
    passwordHash: scryptSync(password, salt, 32, {
      N: 32768,
      r: 8,
      p: 3,
      maxmem: 64 * 1024 * 1024,
    }).toString("hex"),
    recoveryHash: hash(randomBytes(32).toString("hex")),
  };
}

function mysqlDateTime() {
  return new Date().toISOString().slice(0, 23).replace("T", " ");
}

const users = [
  {
    id: crypto.randomUUID(),
    name: "Amministratore",
    surname: "Demo",
    email: adminEmail.toLowerCase(),
    cf: "DMOMNM80A01F205X",
    role: "admin",
    password: adminPassword,
  },
  {
    id: crypto.randomUUID(),
    name: "Cittadino",
    surname: "Demo",
    email: userEmail.toLowerCase(),
    cf: "DMOCDN90A01F205X",
    role: "cittadino",
    password: userPassword,
  },
];

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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const user of users) {
      const [existing] = await connection.execute(
        "SELECT id FROM credentials WHERE email=?",
        [user.email],
      );
      user.id = existing[0]?.id || user.id;
      const credential = createCredential(user.password);
      await connection.execute(
        `INSERT INTO credentials
          (id,email,password_hash,salt,recovery_hash,birth,created)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
          password_hash=VALUES(password_hash),
          salt=VALUES(salt),
          recovery_hash=VALUES(recovery_hash),
          birth=VALUES(birth)`,
        [
          user.id,
          user.email,
          credential.passwordHash,
          credential.salt,
          credential.recoveryHash,
          "1990-01-01",
          mysqlDateTime(),
        ],
      );
      await connection.execute(
        `INSERT INTO users
          (id,name,surname,email,cf,birth,address,role,verification,created)
         VALUES (?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
          name=VALUES(name),
          surname=VALUES(surname),
          email=VALUES(email),
          cf=VALUES(cf),
          role=VALUES(role),
          verification='verified'`,
        [
          user.id,
          user.name,
          user.surname,
          user.email,
          user.cf,
          "1990-01-01",
          "Via Demo 1, Milano",
          user.role,
          "verified",
          mysqlDateTime(),
        ],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  console.log(`Creati/aggiornati: ${adminEmail} (admin), ${userEmail} (cittadino).`);
} finally {
  await pool.end();
}
