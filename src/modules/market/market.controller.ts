import { Controller, Get, Query } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  // Báo giá nhiều mã: /market/quotes?symbols=BTC-USD,AAPL,GC=F
  @Get('quotes')
  quotes(@Query('symbols') symbols = '') {
    return this.market.quotes(symbols.split(',').filter(Boolean));
  }

  // Biểu đồ + chi tiết: /market/chart?symbol=AAPL&tf=1d
  @Get('chart')
  chart(@Query('symbol') symbol = '', @Query('tf') tf = '1d') {
    return this.market.chart(symbol, tf);
  }

  // Tìm kiếm mã: /market/search?q=apple
  @Get('search')
  search(@Query('q') q = '') {
    return this.market.search(q);
  }
}
