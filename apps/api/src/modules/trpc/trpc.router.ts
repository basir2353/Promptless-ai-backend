import { Injectable } from '@nestjs/common';
import { router } from './trpc';
import { memoryRouter } from './routers/memory.router';
import { permissionsRouter } from './routers/permissionsRouter';
import { aiRouter } from './routers/ai.router';
import { billingRouter } from './routers/billing.router';
import { notificationsRouter } from './routers/notifications.router';
import { contextRouter } from './routers/context.router';
import { suggestionsRouter } from './routers/suggestions.router';
import { automationsRouter } from './routers/automations.router';
import { dashboardRouter } from './routers/dashboard.router';
import { authRouter } from './routers/auth.router';

@Injectable()
export class TrpcRouter {
  appRouter = router({
    memory: memoryRouter,
    permissions: permissionsRouter,
    ai: aiRouter,
    billing: billingRouter,
    notifications: notificationsRouter,
    context: contextRouter,
    suggestions: suggestionsRouter,
    automations: automationsRouter,
    dashboard: dashboardRouter,
    auth: authRouter,
  });
}

export type AppRouter = TrpcRouter['appRouter'];
