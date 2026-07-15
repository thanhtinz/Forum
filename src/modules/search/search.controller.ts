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
    @Query('page') page = 1,
    @Query('author') author?: string,
    @Query('categoryId') categoryId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.search.search(q, type, { limit: Number(limit), page: Number(page), author, categoryId, from, to });
  }
}
