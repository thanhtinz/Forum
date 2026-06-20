import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { ToolEngineService } from './tool-engine.service';
import { AiProviderService } from '../ai-companion/ai-provider.service';

@Module({
  providers: [ToolsService, ToolEngineService, AiProviderService],
  controllers: [ToolsController],
  exports: [ToolsService],
})
export class ToolsModule {}
