import { S3Client } from '@aws-sdk/client-s3';

if (
  !process.env.AWS_REGION ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY
) {
  console.error('AWS credentials not configured:', {
    AWS_REGION: process.env.AWS_REGION ? 'set' : 'missing',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'set' : 'missing',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
      ? 'set'
      : 'missing',
  });
  throw new Error(
    'AWS credentials are required. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables.'
  );
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const S3_CONFIG = {
  BUCKET_NAME: process.env.BUCKET_NAME,
  REGION: process.env.AWS_REGION,
  FOLDER_PREFIX: 'user-content',
  PRESIGNED_URL_EXPIRY: 3600, // 1 hour in seconds
} as const;
