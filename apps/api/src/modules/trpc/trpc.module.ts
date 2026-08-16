import { Module } from '@nestjs/common';
import { HealthModule } from '../health/health.module';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';
import { MemoryModule } from '../memory/memory.module';
import { TrpcRouter } from './trpc.router';
import { MemoryRouterService } from './routers/memory.router.service';
import { AiRouterService } from './routers/ai.router.service';

@Module({
  imports: [
    HealthModule,
    DatabaseModule,
    AiModule,
    MemoryModule,
  ],
  providers: [TrpcRouter, MemoryRouterService, AiRouterService],
  exports: [TrpcRouter, MemoryRouterService, AiRouterService],
})
export class TrpcModule {}