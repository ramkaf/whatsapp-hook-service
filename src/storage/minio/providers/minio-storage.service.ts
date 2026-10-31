import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import * as Minio from 'minio';
import type { Readable } from 'node:stream';

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);

  private readonly client: Minio.Client;

  readonly bucket = process.env.MINIO_BUCKET || 'whatsapp-media';

  constructor() {
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;

    if (!accessKey || !secretKey) {
      throw new Error('MinIO credentials are missing');
    }

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
      port: Number(process.env.MINIO_PORT || 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);

    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }

    this.logger.log(`MinIO ready: ${this.bucket}`);
  }

  // Checks whether an object exists while propagating storage access failures.
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error.code === 'NoSuchKey' || error.code === 'NotFound')
      ) {
        return false;
      }
      throw error;
    }
  }

  async uploadStream(
    objectKey: string,
    stream: Readable,
    mimeType: string,
  ): Promise<{ bucket: string; objectKey: string; etag: string }> {
    const result = await this.client.putObject(
      this.bucket,
      objectKey,
      stream,
      undefined,
      {
        'Content-Type': mimeType,
      },
    );

    return {
      bucket: this.bucket,
      objectKey,
      etag: result.etag,
    };
  }
}
