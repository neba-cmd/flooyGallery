import "dotenv/config"
import path from "node:path"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  // Prisma CLI (migrate / db push) always uses a direct, non-pooled connection.
  datasource: {
    // Client generation does not need a live database. Migrate commands still
    // fail safely unless a real direct URL is configured.
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      "postgresql://unconfigured:unconfigured@127.0.0.1:5432/flooy",
  },
})
