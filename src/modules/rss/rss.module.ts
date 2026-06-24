import { Module } from '@nestjs/common';
import { RssController } from './rss.controller';

@Module({ controllers: [RssController] })
export class RssModule {}
