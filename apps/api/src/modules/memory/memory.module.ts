import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [ConfigModule],
  providers: [QdrantService, EmbeddingService],
  exports: [QdrantService, EmbeddingService],
})
export class MemoryModule {}