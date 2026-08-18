import { Injectable } from '@nestjs/common';
import { router } from './trpc';
import { memoryRouter } from './routers/memory.router';
import { permissionsRouter } from './routers/permissionsRouter';

@Injectable()
export class TrpcRouter {
  appRouter = router({
    memory: memoryRouter,
    permissions: permissionsRouter,
  });
}

export type AppRouter = TrpcRouter['appRouter'];