import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

@Processor('memory-processing')
@Injectable()
export class MemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing background memory job ID: ${job.id}`);

    const { userId, text, app } = job.data;

    this.logger.log(
      `Background processing finished for app: ${app} (User: ${userId})`,
    );
    return { status: 'completed', processedAt: new Date().toISOString() };
  }
}