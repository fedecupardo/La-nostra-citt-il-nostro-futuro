import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

type BoundQuery = {
  sql: string;
  params: QueryValue[];
};

type QueryValue = string | number | boolean | Date | Buffer | Uint8Array | null;

type PreparedQuery = {
  query: BoundQuery;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: true; meta: ResultSetHeader }>;
};

let pool: Pool | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: required("AIVEN_MYSQL_HOST"),
      port: Number(process.env.AIVEN_MYSQL_PORT || 3306),
      database: required("AIVEN_MYSQL_DATABASE"),
      user: required("AIVEN_MYSQL_USER"),
      password: required("AIVEN_MYSQL_PASSWORD"),
      ssl: process.env.AIVEN_MYSQL_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }
  return pool;
}

function statement(sql: string, params: QueryValue[]): BoundQuery {
  return { sql, params };
}

function prepared(query: BoundQuery): PreparedQuery {
  return {
    query,
    async first<T = Record<string, unknown>>(): Promise<T | null> {
      const [rows] = await getPool().execute<RowDataPacket[]>(query.sql, query.params);
      return (rows[0] as T | undefined) ?? null;
    },
    async all<T = Record<string, unknown>>() {
      const [rows] = await getPool().execute<RowDataPacket[]>(query.sql, query.params);
      return { results: rows as T[] };
    },
    async run() {
      const [result] = await getPool().execute<ResultSetHeader>(query.sql, query.params);
      return { success: true, meta: result };
    },
  };
}

export function db() {
  return {
    prepare(sql: string) {
      return Object.assign(prepared(statement(sql, [])), {
        bind(...params: QueryValue[]) {
          return prepared(statement(sql, params));
        },
      });
    },
    async batch(queries: PreparedQuery[]): Promise<unknown[]> {
      const connection = await getPool().getConnection();
      try {
        await connection.beginTransaction();
        const results: unknown[] = [];
        for (const query of queries) {
          const [result] = await connection.execute<ResultSetHeader>(
            query.query.sql,
            query.query.params,
          );
          results.push({ results: [], success: true, meta: result });
        }
        await connection.commit();
        return results;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
