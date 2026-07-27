import type { CollectionBeforeValidateHook } from 'payload';
import { ValidationError } from 'payload';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** slug 格式校验：只允许小写字母/数字/连字符，防止后台手输出类似 "AI+Fraud+Cheat"
 *  这种会打断 Payload equals 查询、破坏 URL 的值。只管格式，不自动 slugify——
 *  slug 字段本身 required，管理员应该直接填对。 */
export function validateSlugFormat(collectionSlug: string): CollectionBeforeValidateHook {
  return ({ data, req }) => {
    if (typeof data?.slug === 'string' && data.slug.length > 0 && !SLUG_PATTERN.test(data.slug)) {
      throw new ValidationError(
        {
          collection: collectionSlug,
          errors: [{ path: 'slug', message: 'slug 只能使用小写字母、数字和连字符（例如 ai-fraud-cheat）' }],
          req,
        },
        req.t,
      );
    }
    return data;
  };
}
