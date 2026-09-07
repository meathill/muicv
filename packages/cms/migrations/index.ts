import * as migration_20260516_031843_initial_cms_schema from './20260516_031843_initial_cms_schema';
import * as migration_20260517_024642_enable_user_api_key from './20260517_024642_enable_user_api_key';
import * as migration_20260823_183718_add_articles_collection from './20260823_183718_add_articles_collection';
import * as migration_20260906_032426 from './20260906_032426';

export const migrations = [
  {
    up: migration_20260516_031843_initial_cms_schema.up,
    down: migration_20260516_031843_initial_cms_schema.down,
    name: '20260516_031843_initial_cms_schema',
  },
  {
    up: migration_20260517_024642_enable_user_api_key.up,
    down: migration_20260517_024642_enable_user_api_key.down,
    name: '20260517_024642_enable_user_api_key',
  },
  {
    up: migration_20260823_183718_add_articles_collection.up,
    down: migration_20260823_183718_add_articles_collection.down,
    name: '20260823_183718_add_articles_collection',
  },
  {
    up: migration_20260906_032426.up,
    down: migration_20260906_032426.down,
    name: '20260906_032426',
  },
];
