import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';

const t = initTRPC.create();

@Injectable()
export class AiRouterService {
  constructor(private readonly aiService: AiService) {}

  get router() {
    return t.router({
      chat: t.procedure
        .input(
          z.object({
            userId: z.string(),
            prompt: z.string(),
          }),
        )
        .mutation(async (opts: { input: { userId: string; prompt: string } }) => {
          const { userId, prompt } = opts.input;
          return await this.aiService.generateChatResponse(userId, prompt);
        }),
    });
  }
}