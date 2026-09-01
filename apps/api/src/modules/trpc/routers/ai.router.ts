import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { prisma, requireExistingUser } from '../../../lib/db';

async function postgresContext(userId: string): Promise<string> {
  const memories = await prisma.memoryItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  if (memories.length === 0) return '';
  return `\n### User memory:\n${memories.map((item: { text: string }, i: number) => `- ${i + 1}. ${item.text}`).join('\n')}\n`;
}

async function chatOpenRouter(systemPrompt: string, prompt: string): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Promptless AI',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_SIMPLE_MODEL || 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function chatOllama(systemPrompt: string, prompt: string): Promise<string | null> {
  const base = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  try {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3',
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export const aiRouter = router({
  listModels: publicProcedure.query(() => ({
    success: true,
    models: [
      {
        id: 'openrouter-simple',
        name: process.env.OPENROUTER_SIMPLE_MODEL || 'openai/gpt-4o-mini',
        description: 'Fast OpenRouter model for everyday suggestions',
        tag: 'Fast',
        provider: 'openrouter',
      },
      {
        id: 'openrouter-complex',
        name: process.env.OPENROUTER_COMPLEX_MODEL || 'openai/gpt-4o',
        description: 'Stronger OpenRouter model for harder tasks',
        tag: 'Balanced',
        provider: 'openrouter',
      },
      {
        id: 'ollama',
        name: process.env.OLLAMA_MODEL || 'llama3',
        description: 'Local Ollama — stays on this machine',
        tag: 'Private',
        provider: 'ollama',
      },
    ],
  })),

  chat: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId;
      await requireExistingUser(userId);

      const memory = await postgresContext(userId);
      const systemPrompt = `You are Promptless AI, a proactive collaborator.${memory}Answer directly and briefly.`;

      let provider = 'stub';
      let response =
        await chatOpenRouter(systemPrompt, input.prompt).then((text) => {
          if (text) provider = 'openrouter';
          return text;
        });

      if (!response) {
        response = await chatOllama(systemPrompt, input.prompt);
        if (response) provider = 'ollama';
      }

      if (!response) {
        provider = 'stub';
        response = `I noted: "${input.prompt}". ${memory ? 'I also used your saved memory.' : 'Save memories to personalize replies.'} Add OPENROUTER_API_KEY or start Ollama for a live model.`;
      }

      return {
        success: true,
        response,
        provider,
      };
    }),
});
