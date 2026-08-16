import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcRouter } from './modules/trpc/trpc.router';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const trpcRouter = app.get(TrpcRouter);

  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: trpcRouter.appRouter,
      createContext: () => ({}),
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();