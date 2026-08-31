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
        'POST /trpc/auth.signup': 'Create account (returns accessToken + user)',
        'POST /trpc/auth.login': 'Login (returns accessToken + user)',
        'GET /trpc/auth.me': 'Current user (Bearer token required)',
        'POST /trpc/ai.chat': 'Chat via OpenRouter / Ollama / stub',
        'GET /trpc/ai.listModels': 'Model router list',
        'GET /trpc/billing.getPlans': 'Stripe/local plans',
        'POST /trpc/billing.createCheckout': 'Start checkout',
        'POST /trpc/notifications.registerDevice': 'Register FCM/APNs/web token',
        'POST /trpc/notifications.send': 'Send a push/context alert',
        'POST /trpc/context.ingest': 'Ingest client context (mobile/desktop/vscode/browser)',
        'GET /trpc/permissions.getPermissions': 'Get permissions (Bearer token)',
        'POST /trpc/permissions.togglePermission': 'Toggle an app permission (Bearer token)',
        'POST /trpc/memory.addMemory': 'Save a memory (Bearer token)',
        'GET /trpc/memory.getUserMemories': 'List memories (Bearer token)',
      },
    };
  }

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
