import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { TrpcModule } from './modules/trpc/trpc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Monorepo root + local overrides (dotenv also loaded in main.ts)
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    TrpcModule,
  ],
})
export class AppModule {}
