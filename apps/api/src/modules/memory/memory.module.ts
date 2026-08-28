import { Module } from "@nestjs/common";
import { QdrantService } from "./qdrant.service";
import { EmbeddingService } from "./embedding.service";
import { MemoryExtractorService } from "./memory-extractor.service";
import { ContextRetrieverService } from "./context-retriever.service";

@Module({
  providers: [
    QdrantService,
    EmbeddingService,
    MemoryExtractorService,
    ContextRetrieverService,
  ],
  exports: [
    QdrantService,
    EmbeddingService,
    MemoryExtractorService,
    ContextRetrieverService,
  ],
})
export class MemoryModule {}
