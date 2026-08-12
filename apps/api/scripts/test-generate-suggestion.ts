/**
 * In-process test for `trpc.ai.generateSuggestion`.
 *
 * Usage:
 *   pnpm --filter @promptless/api test:ai
 *   pnpm --filter @promptless/api exec tsx scripts/test-generate-suggestion.ts
 *
 * If OPENROUTER_API_KEY is unset (and Ollama is not forced), AI_STUB=1 is enabled
 * automatically so the procedure still returns a structured Suggestion.
 */
import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

const rootEnv = resolve(__dirname, '../../../.env');
const localEnv = resolve(__dirname, '../.env');
loadEnv({ path: rootEnv });
loadEnv({ path: localEnv, override: true });

async function ollamaReachable(): Promise<boolean> {
  const base = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(
    /\/$/,
    '',
  );
  try {
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const logger = new Logger('test-generate-suggestion');
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY?.trim());
  const forceStub = ['1', 'true', 'yes', 'on'].includes(
    (process.env.AI_STUB ?? '').trim().toLowerCase(),
  );
  const wantSensitive = process.argv.includes('--sensitive');
  const hasOllama = wantSensitive ? await ollamaReachable() : false;

  let usedStub = forceStub;
  if (!forceStub && !hasOpenRouter && !wantSensitive) {
    process.env.AI_STUB = '1';
    usedStub = true;
    logger.warn(
      'OPENROUTER_API_KEY is empty — enabling AI_STUB=1 for this run. Set a key for live OpenRouter calls.',
    );
  }
  if (wantSensitive && !hasOllama && !forceStub) {
    process.env.AI_STUB = '1';
    usedStub = true;
    logger.warn(
      'Ollama is not reachable — enabling AI_STUB=1. Start Ollama or omit --sensitive.',
    );
  }

  // Import after env flags are set so ConfigModule sees AI_STUB.
  const { AppModule } = await import('../src/app.module');
  const { TrpcRouter } = await import('../src/modules/trpc/trpc.router');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const trpc = app.get(TrpcRouter);
    const caller = trpc.createCaller();

    const input = {
      prompt:
        'I spend too long sorting Gmail every morning. Suggest one concrete automation.',
      context: {
        app: 'Gmail',
        signals: ['many unread', 'newsletter pile-up', 'vip threads buried'],
      },
      complexity: 'SIMPLE' as const,
      isSensitive: wantSensitive,
    };

    logger.log('Calling trpc.ai.generateSuggestion …');
    logger.log(`Input: ${JSON.stringify(input, null, 2)}`);

    const result = await caller.ai.generateSuggestion(input);

    // eslint-disable-next-line no-console
    console.log('\n========== AI Suggestion Output ==========\n');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    // eslint-disable-next-line no-console
    console.log('\n==========================================\n');

    if (usedStub) {
      logger.warn('Result came from StubAdapter (offline). Not a live model response.');
    } else {
      logger.log(`Live provider: ${result.provider} / ${result.model}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('test-generate-suggestion failed:', error);
  process.exit(1);
});
