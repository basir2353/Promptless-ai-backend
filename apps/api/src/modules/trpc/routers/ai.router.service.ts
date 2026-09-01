import { Injectable } from '@nestjs/common';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { AiService } from '../../ai/ai.service';
import { protectedProcedure, router } from '../trpc';

const t = initTRPC.create();

@Injectable()
export class AiRouterService {
  constructor(private readonly aiService: AiService) {}

  get router() {
    return t.router({
      chat: protectedProcedure
        .input(
          z.object({
            prompt: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          return await this.aiService.generateChatResponse(ctx.userId, input.prompt);
        }),
    });
  }
}
