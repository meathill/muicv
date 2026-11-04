import path from 'node:path';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { r2Storage } from '@payloadcms/storage-r2';
import { buildConfig } from 'payload';

import { Articles } from './collections/articles';
import { Changelog } from './collections/changelog';
import { Media } from './collections/media';
import { Opportunities } from './collections/opportunities';
import { Posts } from './collections/posts';
import { SkillExtensions } from './collections/skill-extensions';
import { Users } from './collections/users';
import { migrations } from './migrations';
import { resolvePayloadSecret } from './utilities/resolve-secret';

const dirname = import.meta.dirname;

const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build';
const cloudflare = isNextBuild ? null : await getCloudflareContext({ async: true });

type CloudflareRuntimeEnv = NonNullable<typeof cloudflare>['env'];
type CmsD1Database = CloudflareRuntimeEnv['MUICV_CMS_DB'];
type CmsR2Bucket = CloudflareRuntimeEnv['MUICV_CMS_MEDIA'];

function runtimeOnlyBinding<T>(name: string): T {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`${name} is only available in the Cloudflare runtime.`);
      },
    },
  ) as T;
}

const payloadSecret = resolvePayloadSecret(cloudflare?.env, process.env);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
      importMapFile: path.resolve(dirname, 'app/(payload)/admin/importMap.js'),
    },
  },
  collections: [Users, Media, Posts, Articles, SkillExtensions, Changelog, Opportunities],
  editor: lexicalEditor(),
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare?.env.MUICV_CMS_DB ?? runtimeOnlyBinding<CmsD1Database>('MUICV_CMS_DB'),
    prodMigrations: migrations,
  }),
  plugins: [
    r2Storage({
      bucket: cloudflare?.env.MUICV_CMS_MEDIA ?? runtimeOnlyBinding<CmsR2Bucket>('MUICV_CMS_MEDIA'),
      collections: {
        media: true,
      },
    }),
  ],
});
