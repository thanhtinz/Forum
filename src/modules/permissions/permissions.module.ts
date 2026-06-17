import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';

@Global()
@Module({
  providers: [PermissionService, PermissionsGuard],
  controllers: [PermissionsController],
  exports: [PermissionService, PermissionsGuard],
})
export class PermissionsModule {}
