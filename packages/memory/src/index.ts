/** In-memory vector stub — swap for a real vector DB client later. */

export interface EmbeddingRecord {
  id: string;
  text: string;
  vector: number[];
}

const store = new Map<string, EmbeddingRecord>();

export function upsertEmbedding(record: EmbeddingRecord): void {
  store.set(record.id, record);
}

export function getEmbedding(id: string): EmbeddingRecord | undefined {
  return store.get(id);
}

export function listEmbeddings(): EmbeddingRecord[] {
  return [...store.values()];
}
