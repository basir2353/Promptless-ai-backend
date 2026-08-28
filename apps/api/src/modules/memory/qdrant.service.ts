import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QdrantClient } from "@qdrant/js-client-rest";

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  private qdrantUrl: string;
  private apiKey: string;
  public readonly COLLECTION_NAME = "user_memories";

  constructor(private readonly configService: ConfigService) {
    this.qdrantUrl =
      this.configService.get<string>("QDRANT_URL") || "http://localhost:6333";
    this.apiKey = this.configService.get<string>("QDRANT_API_KEY") || "";

    this.client = new QdrantClient({
      url: this.qdrantUrl,
      apiKey: this.apiKey,
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
            distance: "Cosine",
          },
        });

        this.logger.log(
          `Collection '${this.COLLECTION_NAME}' created successfully!`,
        );
      } else {
        this.logger.log(
          `Qdrant Collection '${this.COLLECTION_NAME}' is ready.`,
        );
      }

      await this.client.createPayloadIndex(this.COLLECTION_NAME, {
        field_name: "userId",
        field_schema: "keyword",
      });
      this.logger.log(
        `Payload index for 'userId' ensured on '${this.COLLECTION_NAME}'.`,
      );
    } catch (error) {
      this.logger.error(
        "Failed to connect or initialize Qdrant collection:",
        error,
      );
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
    try {
      const endpoint = `${this.qdrantUrl.replace(/\/$/, "")}/collections/${this.COLLECTION_NAME}/points/search`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { "api-key": this.apiKey } : {}),
        },
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          filter: {
            must: [
              {
                key: "userId",
                match: {
                  value: userId,
                },
              },
            ],
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          "Qdrant Native Search Raw Error:",
          JSON.stringify(data),
        );
        throw new Error(data?.status?.error || "Qdrant search request failed");
      }

      return data.result;
    } catch (err: any) {
      this.logger.error("Qdrant Search Error Details:", err?.message || err);
      throw err;
    }
  }

  async deleteMemory(memoryId: string) {
    try {
      return await this.client.delete(this.COLLECTION_NAME, {
        points: [memoryId],
      });
    } catch (err: any) {
      this.logger.error("Failed to delete memory point:", err?.message || err);
      throw err;
    }
  }

  async clearUserMemories(userId: string) {
    try {
      return await this.client.delete(this.COLLECTION_NAME, {
        filter: {
          must: [
            {
              key: "userId",
              match: {
                value: userId,
              },
            },
          ],
        },
      });
    } catch (err: any) {
      this.logger.error("Failed to clear user memories:", err?.message || err);
      throw err;
    }
  }
}
