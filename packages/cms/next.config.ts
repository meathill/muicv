import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  transpilePackages: ['@muicv/shared'],
};

export default withPayload(nextConfig);
