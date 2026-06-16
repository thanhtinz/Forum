import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, SearchType } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(
    @Query('q') q = '',
    @Query('type') type: SearchType = 'all',
    @Query('limit') limit = 10,
  ) {
    return this.search.search(q, type, Number(limit));
  }
}
