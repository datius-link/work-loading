import dotenv from "dotenv";
dotenv.config();

/**
 * @type { import("knex").Knex.Config }
 */
export default {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations",
    },
  },

  staging: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations",
    },
  },

  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    // Neon (serverless Postgres) can suspend its compute when idle; without
    // bounded timeouts here, a request that needs a new connection during
    // that wake-up can hang indefinitely instead of failing fast.
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 15000,
      createTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations",
    },
  },
};
