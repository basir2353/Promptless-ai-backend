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
      // 1. Fetch Relevant Context from Qdrant Vector DB
      const memoryContext = await this.contextRetrieverService.buildLLMContext(
        userId,
        userPrompt,
        3,
      );

      // 2. Build System Prompt with Injected Memory
      const systemPrompt = `You are Promptless AI, an intelligent AI Assistant with long-term persistent memory.${memoryContext}\nAnswer the user's question directly and concisely utilizing their background context if relevant.`;

      let aiResponse = '';
      const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
      const groqKey = process.env.GROQ_API_KEY?.replace(/"/g, '')?.trim();

      // Priority 1: OpenRouter API (Using configured OPENROUTER_API_KEY)
      if (openRouterKey && openRouterKey.startsWith('sk-or-v1-')) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Promptless Backend',
            },
            body: JSON.stringify({
              model: process.env.OPENROUTER_SIMPLE_MODEL || 'google/gemini-2.5-flash:free',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          });

          const data = await response.json();
          if (data.choices && data.choices[0]?.message?.content) {
            aiResponse = data.choices[0].message.content;
          } else {
            this.logger.warn('OpenRouter fallback triggered:', JSON.stringify(data));
          }
        } catch (err: any) {
          this.logger.error('OpenRouter call failed:', err?.message || err);
        }
      }

      // Priority 2: Groq API (Fallback)
      if (!aiResponse && groqKey && groqKey.startsWith('gsk_')) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          });

          const data = await response.json();
          if (data.choices && data.choices[0]?.message?.content) {
            aiResponse = data.choices[0].message.content;
          } else {
            this.logger.error('Groq call failed:', JSON.stringify(data));
          }
        } catch (err: any) {
          this.logger.error('Groq fetch error:', err?.message || err);
        }
      }

      if (!aiResponse) {
        aiResponse = '[API Configuration Error]: Neither OpenRouter nor Groq produced a response.';
      }

      // 3. Non-blocking Background Memory Extraction
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