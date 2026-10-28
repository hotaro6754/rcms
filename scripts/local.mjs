#!/usr/bin/env node
/**
 * One command to run everything on your own computer:
 *
 *   npm install
 *   npm run local
 *
 * It needs MariaDB (or MySQL) installed and running on this computer, the same kind of database
 * the live site uses. The first run asks for its root password and writes .env (with a fresh
 * random secret); then it creates the database if missing, creates or updates the tables, adds
 * the starter content and the synthetic test accounts, and starts the site at
 * http://localhost:3000. Ctrl-C stops the site; the data stays in the local database.
 *
 * LOCAL ONLY: it creates test accounts with a published password. Never point it at a shared
 * or production database.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { createInterface } from "node:readline/promises";

const DB_NAME = "rcmexcel_dev";
const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1"];

const log = (m) => console.log(`\n[local] ${m}`);
const fail = (m) => {
  console.error(`\n[local] ${m}\n`);
  process.exit(1);
};

// 0. Dependencies must be installed in this folder first
if (!existsSync("node_modules/prisma") || !existsSync("node_modules/next")) {
  fail(`The project's packages are not installed in this folder (${process.cwd()}).
        Run  npm install  here, in the folder that contains package.json, wait for it to finish,
        then run  npm run local  again.`);
}

const INSTALL_HELP = `No MySQL or MariaDB server is answering on this computer.
        Install MariaDB once (free): https://mariadb.org/download/ (Windows: the .msi installer).
        Remember the root password it asks you to choose, keep the port at 3306, then run
        npm run local  again.`;

// 1. Settings: the first run asks for the database password and writes .env (local only, never committed)
if (!existsSync(".env")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n[local] First run. This needs MariaDB (or MySQL) installed on this computer.");
  const password = await rl.question("[local] MariaDB root password (press Enter if it has none): ");
  const port = (await rl.question("[local] MariaDB port [3306]: ")).trim() || "3306";
  rl.close();
  const base = existsSync(".env.example") ? readFileSync(".env.example", "utf8") : "";
  const set = (text, key, value) => {
    const line = `${key}="${value}"`;
    return new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${text}\n${line}\n`;
  };
  let env = base;
  env = set(env, "DATABASE_URL", `mysql://root:${encodeURIComponent(password)}@127.0.0.1:${port}/${DB_NAME}`);
  env = set(env, "BETTER_AUTH_SECRET", randomBytes(32).toString("base64"));
  env = set(env, "BETTER_AUTH_URL", "http://localhost:3000");
  env = set(env, "NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  writeFileSync(".env", env);
  log("Created .env (database address and a new random secret). It stays on this computer.");
}
const env = { ...process.env };
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
let dbUrl;
try {
  dbUrl = new URL(env.DATABASE_URL ?? "");
} catch {
  fail("DATABASE_URL in .env is not a valid mysql:// address. Delete .env and run  npm run local  again.");
}
if (!["mysql:", "mariadb:"].includes(dbUrl.protocol) || !LOCAL_HOSTS.includes(dbUrl.hostname.replace(/^\[|\]$/g, ""))) {
  fail("DATABASE_URL in .env does not point at a MySQL/MariaDB database on this computer. Refusing to continue, so test accounts are never created in another database. Delete .env to start fresh.");
}

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env, ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
    p.on("error", reject);
  });

// 2. Database: the server must be running; the database itself is created if missing
const port = Number(dbUrl.port || 3306);
const listening = await new Promise((resolve) => {
  const s = net.connect(port, dbUrl.hostname.replace(/^\[|\]$/g, ""));
  s.on("connect", () => (s.destroy(), resolve(true)));
  s.on("error", () => resolve(false));
});
if (!listening) fail(INSTALL_HELP);
{
  const { default: mariadb } = await import("mariadb");
  const name = decodeURIComponent(dbUrl.pathname.replace(/^\//, "")) || DB_NAME;
  let conn;
  try {
    conn = await mariadb.createConnection({ host: dbUrl.hostname, port, user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password), allowPublicKeyRetrieval: true });
  } catch (e) {
    fail(`Could not sign in to the database server: ${e.message}
        If the password is wrong, delete .env and run  npm run local  again.`);
  }
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name.replace(/`/g, "")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

let site = null;
const stop = () => site?.kill();
process.on("SIGINT", () => (stop(), process.exit(0)));
process.on("SIGTERM", () => (stop(), process.exit(0)));

try {
  // 3. Tables and starter data (accounts are created if missing)
  log("Creating or updating the tables...");
  await run("npm", ["run", "db:deploy"]);
  log("Adding the starter courses and content...");
  await run("npm", ["run", "db:seed"]);
  log("Creating the test accounts (existing ones are kept)...");
  await run("npm", ["run", "dev:accounts"]);

  // 4. The site
  console.log(`
==========================================================================
  RCMExcel is starting at   http://localhost:3000
  Admin area                http://localhost:3000/admin

  Sign in:  admin@rcmexcel.com   (Super Administrator)
            student@rcmexcel.com (learner)
  Password for every test account:  Rcms-dev-password-1

  The first page takes a while to open while it compiles. Ctrl-C to stop.
==========================================================================
`);
  site = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", "3000"], { stdio: "inherit", shell: process.platform === "win32", env });
  site.on("exit", (code) => process.exit(code ?? 0));
} catch (e) {
  console.error(`\n[local] ${e.message}`);
  stop();
  process.exit(1);
}
