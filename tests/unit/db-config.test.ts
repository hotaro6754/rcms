import { describe, expect, it } from "vitest";
import { mysqlPoolConfig } from "@/lib/db-config";

describe("database connection settings", () => {
  it("read host, port, credentials and database from DATABASE_URL", () => {
    const cfg = mysqlPoolConfig("mysql://u%40x:p%23w@localhost:3307/app", 4);
    expect(cfg).toMatchObject({ host: "127.0.0.1", port: 3307, user: "u@x", password: "p#w", database: "app", connectionLimit: 4 });
  });

  it("set the tables' collation on every connection, so LIKE filters work whatever the server default", () => {
    // Without it, Hostinger's MariaDB refused contains/startsWith/endsWith with error 1267.
    expect(mysqlPoolConfig("mysql://u:p@127.0.0.1:3306/app", 1).initSql).toBe("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  });
});
