#!/usr/bin/env node
/**
 * One command to run everything on your own computer:
 *
 *   npm install
 *   npm run local
 *
 * It creates .env if there is none (with a fresh random secret), starts the local database
 * (PGlite: real PostgreSQL, no install needed), creates the tables, adds the starter content
 * and the synthetic test accounts the first time, then starts the site at http://localhost:3000.
 * Ctrl-C stops the site and the database. Data is kept in .pgdata/ between runs.
 *
 * LOCAL ONLY: it creates test accounts with a published password. Never point it at a shared
 * or production database.
 */
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";

const PORT = 55432;
const URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`;
const MARKER = ".pgdata/.rcms-local-ready";

const log = (m) => console.log(`\n[local] ${m}`);

// 0. Dependencies must be installed in this folder first
if (!existsSync("node_modules/prisma") || !existsSync("node_modules/next")) {
  console.error(`
[local] The project's packages are not installed in this folder (${process.cwd()}).
        Run  npm install  here, in the folder that contains package.json, wait for it to finish,
        then run  npm run local  again.
`);
  process.exit(1);
}

// 1. Settings
if (!existsSync(".env")) {
  const base = existsSync(".env.example") ? readFileSync(".env.example", "utf8") : "";
  const set = (text, key, value) => {
    const line = `${key}="${value}"`;
    return new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), line) : `${text}\n${line}\n`;
  };
  let env = base;
  env = set(env, "DATABASE_URL", URL);
  env = set(env, "DATABASE_POOL_MAX", "1");
  env = set(env, "BETTER_AUTH_SECRET", randomBytes(32).toString("base64"));
  env = set(env, "BETTER_AUTH_URL", "http://localhost:3000");
  env = set(env, "NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  writeFileSync(".env", env);
  log("Created .env with a new random secret.");
}
const env = { ...process.env };
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}
if (!env.DATABASE_URL?.includes(`:${PORT}/`)) {
  console.error(`[local] .env points DATABASE_URL somewhere other than the local database (port ${PORT}). Refusing to continue so test accounts are never created in another database. Delete .env to start fresh.`);
  process.exit(1);
}

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", env, ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`))));
    p.on("error", reject);
  });

const portOpen = () =>
  new Promise((resolve) => {
    const s = net.connect(PORT, "127.0.0.1");
    s.on("connect", () => (s.destroy(), resolve(true)));
    s.on("error", () => resolve(false));
  });

// 2. Database
let db = null;
if (await portOpen()) {
  log(`A database is already running on port ${PORT}; using it.`);
} else {
  log("Starting the local database...");
  db = spawn(process.execPath, ["scripts/dev-db.mjs"], { stdio: "inherit", env });
  db.on("exit", (code) => {
    if (code) console.error(`[local] The database stopped (exit ${code}).`);
  });
  for (let i = 0; i < 60 && !(await portOpen()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await portOpen())) {
    console.error("[local] The database did not start.");
    process.exit(1);
  }
}

let site = null;
const stop = () => {
  site?.kill();
  db?.kill();
};
process.on("SIGINT", () => (stop(), process.exit(0)));
process.on("SIGTERM", () => (stop(), process.exit(0)));

try {
  // 3. Tables and starter data (accounts only the first time)
  log("Creating the tables...");
  await run("npm", ["run", "db:deploy"]);
  log("Adding the starter courses and content...");
  await run("npm", ["run", "db:seed"]);
  if (!existsSync(MARKER)) {
    log("Creating the test accounts...");
    await run("npm", ["run", "dev:accounts"]);
    writeFileSync(MARKER, new Date().toISOString());
  }

  // 4. The site
  console.log(`
==========================================================================
  RCMExcel is starting at   http://localhost:3000
  Admin area                http://localhost:3000/admin

  Sign in:  super@rcms.test   (Super Administrator)
            student@rcms.test (learner)
  Password for every test account:  Rcms-dev-password-1

  The first page takes a while to open while it compiles. Ctrl-C to stop.
==========================================================================
`);
  site = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", "3000"], { stdio: "inherit", shell: process.platform === "win32", env });
  site.on("exit", (code) => {
    db?.kill();
    process.exit(code ?? 0);
  });
} catch (e) {
  console.error(`\n[local] ${e.message}`);
  stop();
  process.exit(1);
}
