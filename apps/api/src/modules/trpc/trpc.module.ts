import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { HealthModule } from '../health/health.module';
import { TrpcRouter } from './trpc.router';

@Module({
  imports: [HealthModule, AiModule],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule {}
