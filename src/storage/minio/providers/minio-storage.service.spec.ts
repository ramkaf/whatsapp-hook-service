import { MinioStorageService } from './minio-storage.service.ts';

const { statObject } = vi.hoisted(() => ({ statObject: vi.fn() }));
vi.mock('minio', () => ({
  Client: class {
    statObject = statObject;
  },
}));

describe('MinioStorageService.objectExists', () => {
  let storage: MinioStorageService;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('MINIO_ACCESS_KEY', 'test-access');
    vi.stubEnv('MINIO_SECRET_KEY', 'test-secret');
    vi.stubEnv('MINIO_BUCKET', 'test-bucket');
    storage = new MinioStorageService();
  });

  afterEach(() => vi.unstubAllEnvs());

  it('returns true for an existing object', async () => {
    statObject.mockResolvedValue({ etag: 'existing-etag' });
    await expect(storage.objectExists('media/image.jpg')).resolves.toBe(true);
    expect(statObject).toHaveBeenCalledWith('test-bucket', 'media/image.jpg');
  });

  it.each(['NoSuchKey', 'NotFound'])('returns false for %s', async (code) => {
    statObject.mockRejectedValue(
      Object.assign(new Error('not found'), { code }),
    );
    await expect(storage.objectExists('media/image.jpg')).resolves.toBe(false);
  });

  it.each(['AccessDenied', 'NoSuchBucket', 'ECONNREFUSED'])(
    'propagates %s instead of treating the object as missing',
    async (code) => {
      const error = Object.assign(new Error('storage failed'), { code });
      statObject.mockRejectedValue(error);
      await expect(storage.objectExists('media/image.jpg')).rejects.toBe(error);
    },
  );
});
