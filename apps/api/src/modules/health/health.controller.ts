import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@promptless/core";
import { HealthService } from "./health.service";

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getRoot() {
    return {
      name: 'Promptless API',
      message: 'API is running. Use /health or the tRPC routes below.',
      health: '/health',
      endpoints: {
        'GET /health': 'API + database status',
        'POST /trpc/ai.chat': 'Chat via OpenRouter / Ollama / stub',
        'GET /trpc/ai.listModels': 'Model router list',
        'GET /trpc/billing.getPlans': 'Stripe/local plans',
        'POST /trpc/billing.createCheckout': 'Start checkout',
        'POST /trpc/notifications.registerDevice': 'Register FCM/APNs/web token',
        'POST /trpc/notifications.send': 'Send a push/context alert',
        'POST /trpc/context.ingest': 'Ingest client context (mobile/desktop/vscode/browser)',
        'GET /trpc/permissions.getPermissions?input={"userId":"user-1"}': 'Get permissions',
        'POST /trpc/permissions.togglePermission': 'Toggle an app permission',
        'POST /trpc/memory.addMemory': 'Save a memory',
        'GET /trpc/memory.getUserMemories?input={"userId":"user-1"}': 'List memories',
      },
    };
  }

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
