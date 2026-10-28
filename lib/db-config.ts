import type { PoolConfig } from "mariadb";

/**
 * Turns DATABASE_URL (`mysql://user:password@host:port/database`, the form Hostinger writes, or
 * `mariadb://…`) into settings for the MariaDB driver, which serves both MariaDB and MySQL.
 * User and password may be percent-encoded. `?ssl=true` turns on TLS for databases reached over
 * the internet; a database on the same server (127.0.0.1) does not need it.
 */
export function mysqlPoolConfig(url: string, connectionLimit: number): PoolConfig {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid address. Expected mysql://user:password@host:3306/database");
  }
  if (!["mysql:", "mariadb:"].includes(u.protocol)) {
    throw new Error("DATABASE_URL must start with mysql:// (this app uses MySQL or MariaDB).");
  }
  const database = decodeURIComponent(u.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL has no database name after the host.");
  const ssl = ["true", "1", "required"].includes((u.searchParams.get("ssl") ?? u.searchParams.get("sslmode") ?? "").toLowerCase());
  return {
    // localhost can resolve to IPv6 (::1), which shared-hosting database users are often not
    // allowed to connect from; 127.0.0.1 is what Hostinger recommends for Node.js apps.
    host: u.hostname === "localhost" ? "127.0.0.1" : u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
    connectionLimit,
    ...(ssl ? { ssl: { rejectUnauthorized: true } } : {}),
    // MySQL 8 servers using caching_sha2_password over a plain connection need this; harmless on MariaDB.
    allowPublicKeyRetrieval: u.searchParams.get("allowPublicKeyRetrieval") === "true",
  };
}
