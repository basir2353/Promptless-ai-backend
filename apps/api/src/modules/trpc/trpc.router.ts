import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { MemoryRouterService } from './routers/memory.router.service';
import { AiRouterService } from './routers/ai.router.service';

const t = initTRPC.create();

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly memoryRouterService: MemoryRouterService,
    private readonly aiRouterService: AiRouterService,
  ) {}

  get appRouter() {
    return t.router({
      memory: this.memoryRouterService.router,
      ai: this.aiRouterService.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];