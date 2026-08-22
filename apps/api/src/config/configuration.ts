export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? '',
    name: process.env.DATABASE_NAME ?? 'promptless',
    ssl: (process.env.DATABASE_SSL ?? 'false').toLowerCase() === 'true',
  },
  ai: {
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterBaseUrl:
      process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
    complexModel:
      process.env.OPENROUTER_COMPLEX_MODEL ??
      process.env.AI_COMPLEX_MODEL ??
      'openai/gpt-4o',
    simpleModel:
      process.env.OPENROUTER_SIMPLE_MODEL ??
      process.env.AI_SIMPLE_MODEL ??
      'openai/gpt-4o-mini',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3',
    temperature: process.env.AI_TEMPERATURE
      ? Number(process.env.AI_TEMPERATURE)
      : 0.2,
    stub: ['1', 'true', 'yes', 'on'].includes(
      (process.env.AI_STUB ?? '').trim().toLowerCase(),
    ),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
  push: {
    fcmServerKey: process.env.FCM_SERVER_KEY,
  },
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:3000',
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5174',
});
