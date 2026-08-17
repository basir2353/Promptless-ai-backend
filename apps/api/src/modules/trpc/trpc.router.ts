import { Injectable } from '@nestjs/common';
import { router } from './trpc';
import { memoryRouter } from './routers/memory.router';

@Injectable()
export class TrpcRouter {
  appRouter = router({
    memory: memoryRouter,
  });
}

export type AppRouter = TrpcRouter['appRouter'];