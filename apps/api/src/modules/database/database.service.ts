import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

export interface DatabaseHealth {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private lastHealth: DatabaseHealth = { connected: false };

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error("Database pool is not initialized");
    }
    return this.pool;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.getPool().query<T>(text, params);
  }

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  getLastHealth(): DatabaseHealth {
    return this.lastHealth;
  }

  async checkHealth(): Promise<DatabaseHealth> {
    if (!this.pool) {
      this.lastHealth = {
        connected: false,
        error: "Database pool not initialized",
      };
      return this.lastHealth;
    }

    const started = Date.now();
    try {
      await this.pool.query("SELECT 1 AS ok");
      this.lastHealth = {
        connected: true,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      this.lastHealth = {
        connected: false,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    return this.lastHealth;
  }

  private async connect(): Promise<void> {
    const url = this.config.get<string>("database.url");
    const ssl = this.config.get<boolean>("database.ssl")
      ? { rejectUnauthorized: false }
      : false;

    this.pool = url
      ? new Pool({
          connectionString: url,
          ssl,
          max: 10,
          idleTimeoutMillis: 30_000,
        })
      : new Pool({
          host: this.config.get<string>("database.host"),
          port: this.config.get<number>("database.port"),
          user: this.config.get<string>("database.user"),
          password: this.config.get<string>("database.password"),
          database: this.config.get<string>("database.name"),
          ssl,
          max: 10,
          idleTimeoutMillis: 30_000,
        });

    this.pool.on("error", (err) => {
      this.logger.error(`Unexpected PostgreSQL pool error: ${err.message}`);
      this.lastHealth = { connected: false, error: err.message };
    });

    const health = await this.checkHealth();
    if (health.connected) {
      this.logger.log(
        `PostgreSQL connected (${health.latencyMs ?? 0}ms) → ${this.describeTarget()}`,
      );
      await this.ensureSchema();
    } else {
      // Do not crash the API — health endpoint reports DB status
      this.logger.warn(
        `PostgreSQL not reachable (${health.error ?? "unknown"}). ` +
          `Update DATABASE_* in .env. Target: ${this.describeTarget()}`,
      );
    }
  }

  private async ensureSchema(): Promise<void> {
    try {
      await this.query(`
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await this.query(
        `
        INSERT INTO app_meta (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `,
        ["schema_version", "1"],
      );
    } catch (error) {
      this.logger.warn(
        `Could not ensure schema: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.log("PostgreSQL pool closed");
    }
  }

  private describeTarget(): string {
    const url = this.config.get<string>("database.url");
    if (url) {
      try {
        const parsed = new URL(url);
        return `${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//, "")}`;
      } catch {
        return "[DATABASE_URL]";
      }
    }
    return `${this.config.get("database.host")}:${this.config.get("database.port")}/${this.config.get("database.name")}`;
  }
}
