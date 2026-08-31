import { NestFactory } from '@nestjs/core';
import { json, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import * as trpcExpress from '@trpc/server/adapters/express';
import { TrpcRouter } from './modules/trpc/trpc.router';
import { createTRPCContext } from './modules/trpc/context';

async function bootstrap() {
  // tRPC must read the raw body. Nest's JSON parser would eat it first
  // and leave procedure inputs as undefined.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.enableCors();

  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
      if (!contentType || contentType.startsWith('text/plain')) {
        req.headers['content-type'] = 'application/json';
      }
    }
    next();
  });

  const trpcRouter = app.get(TrpcRouter);
  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: trpcRouter.appRouter,
      createContext: createTRPCContext,
    }),
  );

  app.use(json());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
