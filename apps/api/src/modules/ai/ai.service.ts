import { Injectable, Logger } from '@nestjs/common';
import { ContextRetrieverService } from '../memory/context-retriever.service';
import { MemoryExtractorService } from '../memory/memory-extractor.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly contextRetrieverService: ContextRetrieverService,
    private readonly memoryExtractorService: MemoryExtractorService,
  ) {}

  async generateChatResponse(userId: string, userPrompt: string) {
    try {
      // 1. Fetch Relevant Context from Vector DB
      const memoryContext = await this.contextRetrieverService.buildLLMContext(
        userId,
        userPrompt,
        3,
      );

      // 2. Build System Prompt with Injected Memory
      const systemPrompt = `You are an intelligent AI Assistant with persistent memory.${memoryContext}\nAnswer the user query accurately utilizing their background context if relevant.`;

      // 3. Simulated LLM Response (Or replace with OpenAI / Gemini API Call)
      const aiResponse = `Received prompt: "${userPrompt}". Memory Injected Context: ${
        memoryContext ? 'Yes' : 'None'
      }`;

      // 4. Background Extraction (Async - Non Blocking)
      this.memoryExtractorService
        .processAndStoreMemory(userId, userPrompt)
        .catch((err) => this.logger.error('Background memory extraction failed:', err));

      return {
        success: true,
        response: aiResponse,
        systemPromptUsed: systemPrompt,
      };
    } catch (error: any) {
      this.logger.error('Failed to generate chat response:', error?.message || error);
      throw error;
    }
  }
}