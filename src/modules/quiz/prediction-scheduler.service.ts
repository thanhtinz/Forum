import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionService } from './prediction.service';

// Tác vụ định kỳ cho hệ thống kèo: khoá kèo quá hạn & tự quyết toán theo nguồn ngoài.
@Injectable()
export class PredictionSchedulerService {
  private readonly logger = new Logger('PredictionScheduler');

  constructor(private readonly predictions: PredictionService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoTasks() {
    try {
      const locked = await this.predictions.autoLockAll();
      if (locked > 0) this.logger.log(`Đã tự khoá ${locked} kèo quá hạn`);
      const ext = await this.predictions.resolveExternalPending();
      if (ext.settled > 0) this.logger.log(`Đã tự quyết toán ${ext.settled} kèo từ nguồn ngoài`);
    } catch (e: any) {
      this.logger.error(`Lỗi tác vụ tự động: ${e?.message}`);
    }
  }
}
