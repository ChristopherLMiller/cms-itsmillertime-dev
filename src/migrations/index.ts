import * as migration_20260612_072836_better_auth_1_6 from './20260612_072836_better_auth_1_6';
import * as migration_20260727_article_relations from './20260727_article_relations';
import * as migration_20260727_article_relations_repair from './20260727_article_relations_repair';
import * as migration_20260727_twofactor_lockout from './20260727_twofactor_lockout';
import * as migration_20260731_models_related_posts_join from './20260731_models_related_posts_join';
import * as migration_20260731_restore_models_related_posts from './20260731_restore_models_related_posts';
import * as migration_20260805_gallery_albums_default_sort from './20260805_gallery_albums_default_sort';
import * as migration_20260805_upload_collection_prefixes from './20260805_upload_collection_prefixes';
import * as migration_20260817_gallery_masters from './20260817_gallery_masters';
import * as migration_20260818_210234_galleryProductRequests from './20260818_210234_galleryProductRequests';
import * as migration_20260830_102053_site_settings from './20260830_102053_site_settings';
import * as migration_20260901_account_link_user_fields from './20260901_account_link_user_fields';

export const migrations = [
  {
    up: migration_20260612_072836_better_auth_1_6.up,
    down: migration_20260612_072836_better_auth_1_6.down,
    name: '20260612_072836_better_auth_1_6',
  },
  {
    up: migration_20260727_article_relations.up,
    down: migration_20260727_article_relations.down,
    name: '20260727_article_relations',
  },
  {
    up: migration_20260727_article_relations_repair.up,
    down: migration_20260727_article_relations_repair.down,
    name: '20260727_article_relations_repair',
  },
  {
    up: migration_20260727_twofactor_lockout.up,
    down: migration_20260727_twofactor_lockout.down,
    name: '20260727_twofactor_lockout',
  },
  {
    up: migration_20260731_models_related_posts_join.up,
    down: migration_20260731_models_related_posts_join.down,
    name: '20260731_models_related_posts_join',
  },
  {
    up: migration_20260731_restore_models_related_posts.up,
    down: migration_20260731_restore_models_related_posts.down,
    name: '20260731_restore_models_related_posts',
  },
  {
    up: migration_20260805_gallery_albums_default_sort.up,
    down: migration_20260805_gallery_albums_default_sort.down,
    name: '20260805_gallery_albums_default_sort',
  },
  {
    up: migration_20260805_upload_collection_prefixes.up,
    down: migration_20260805_upload_collection_prefixes.down,
    name: '20260805_upload_collection_prefixes',
  },
  {
    up: migration_20260817_gallery_masters.up,
    down: migration_20260817_gallery_masters.down,
    name: '20260817_gallery_masters',
  },
  {
    up: migration_20260818_210234_galleryProductRequests.up,
    down: migration_20260818_210234_galleryProductRequests.down,
    name: '20260818_210234_galleryProductRequests',
  },
  {
    up: migration_20260830_102053_site_settings.up,
    down: migration_20260830_102053_site_settings.down,
    name: '20260830_102053_site_settings',
  },
  {
    up: migration_20260901_account_link_user_fields.up,
    down: migration_20260901_account_link_user_fields.down,
    name: '20260901_account_link_user_fields',
  },
];
