import { Inject, Injectable } from "@nestjs/common";
import type { HealthResponse } from "@promptless/core";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const database = await this.database.checkHealth();

    return {
      // API process is up — nested `database` reports PG connectivity
      status: "ok",
      message: "Backend is running",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      database,
    };
  }
}
