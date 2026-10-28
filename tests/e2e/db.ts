import mariadb from "mariadb";

/**
 * A direct connection to the local development database, for the few browser tests and demo
 * recordings that put data back to a known state first. Refuses anything not on this machine.
 */
export async function localDb() {
  const raw = process.env.DATABASE_URL ?? "";
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Set DATABASE_URL to the local mysql:// database before running these tests.");
  }
  if (!["127.0.0.1", "localhost"].includes(u.hostname)) throw new Error("E2E data reset runs only against a local database.");
  return mariadb.createConnection({
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    allowPublicKeyRetrieval: true,
  });
}
