import { Inject, Injectable } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { TRPCError } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { AiGatewayError } from '@promptless/ai';
import { z } from 'zod';
import { AiService } from '../ai/ai.service';
import { DatabaseService } from '../database/database.service';
import { HealthService } from '../health/health.service';
import { MemoryRouterService } from './routers/memory.router.service';

const generateSuggestionInput = z.object({
  prompt: z.string().min(1),
  context: z
    .union([z.string(), z.record(z.unknown())])
    .optional(),
  complexity: z.enum(['SIMPLE', 'COMPLEX']),
  isSensitive: z.boolean(),
});

@Injectable()
export class TrpcRouter {
  private readonly t = initTRPC.create();

  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(MemoryRouterService) private readonly memoryRouter: MemoryRouterService,
  ) {}

  createAppRouter() {
    const publicProcedure = this.t.procedure;

    return this.t.router({
      health: publicProcedure.query(async () => this.healthService.getHealth()),

      ping: publicProcedure
        .input(z.object({ message: z.string().optional() }).optional())
        .query(({ input }) => ({
          echo: input?.message ?? 'pong',
          at: new Date().toISOString(),
        })),

      dbStatus: publicProcedure.query(async () => this.database.checkHealth()),

      memory: this.memoryRouter.router,

      ai: this.t.router({
        generateSuggestion: publicProcedure
          .input(generateSuggestionInput)
          .mutation(async ({ input }) => {
            try {
              return await this.aiService.generateSuggestion(input);
            } catch (error) {
              throw this.toTrpcError(error);
            }
          }),
      }),
    });
  }

  /** In-process caller for scripts/tests (no HTTP server required). */
  createCaller() {
    return this.t.createCallerFactory(this.createAppRouter())({});
  }

  applyMiddleware(app: INestApplication): void {
    const expressApp = app.getHttpAdapter().getInstance();
    const router = this.createAppRouter();

    expressApp.use(
      '/trpc',
      createExpressMiddleware({
        router,
        createContext: () => ({}),
      }),
    );
  }

  private toTrpcError(error: unknown): TRPCError {
    if (error instanceof AiGatewayError) {
      const code =
        error.code === 'CONFIG_ERROR'
          ? 'PRECONDITION_FAILED'
          : error.code === 'PARSE_ERROR'
            ? 'BAD_REQUEST'
            : error.code === 'ROUTING_ERROR'
              ? 'BAD_REQUEST'
              : 'INTERNAL_SERVER_ERROR';

      return new TRPCError({
        code,
        message: error.message,
        cause: error,
      });
    }

    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unexpected AI error',
      cause: error,
    });
  }
}

export type AppRouter = ReturnType<TrpcRouter['createAppRouter']>;