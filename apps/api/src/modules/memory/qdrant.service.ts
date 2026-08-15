import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  public readonly COLLECTION_NAME = 'user_memories';

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      apiKey,
    });
  }

  async onModuleInit() {
    await this.ensureCollectionExists();
  }

  private async ensureCollectionExists() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.COLLECTION_NAME,
      );

      if (!exists) {
        this.logger.log(
          `Collection '${this.COLLECTION_NAME}' not found. Creating new collection...`,
        );

        await this.client.createCollection(this.COLLECTION_NAME, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });

        this.logger.log(`Collection '${this.COLLECTION_NAME}' created successfully!`);
      } else {
        this.logger.log(`Qdrant Collection '${this.COLLECTION_NAME}' is ready.`);
      }
    } catch (error) {
      this.logger.error('Failed to connect or initialize Qdrant collection:', error);
    }
  }

  async upsertMemory(payload: {
    id: string;
    vector: number[];
    userId: string;
    text: string;
    metadata?: Record<string, any>;
  }) {
    return await this.client.upsert(this.COLLECTION_NAME, {
      points: [
        {
          id: payload.id,
          vector: payload.vector,
          payload: {
            userId: payload.userId,
            text: payload.text,
            ...payload.metadata,
          },
        },
      ],
    });
  }

  async searchSimilar(userId: string, vector: number[], limit = 5) {
    return await this.client.query(this.COLLECTION_NAME, {
      query: vector,
      limit,
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
    });
  }
}