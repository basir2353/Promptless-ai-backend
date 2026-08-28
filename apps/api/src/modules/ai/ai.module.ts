import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { MemoryModule } from "../memory/memory.module";

@Module({
  imports: [MemoryModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
