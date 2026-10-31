import { Module } from '@nestjs/common';
import { MinioStorageService } from './providers/minio-storage.service.ts';

@Module({
  providers: [MinioStorageService],
  exports: [MinioStorageService],
})
export class MinioStorageModule {}
