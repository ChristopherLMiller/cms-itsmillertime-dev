import * as migration_20260612_072836_better_auth_1_6 from './20260612_072836_better_auth_1_6';
import * as migration_20260727_article_relations from './20260727_article_relations';
import * as migration_20260727_twofactor_lockout from './20260727_twofactor_lockout';

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
    up: migration_20260727_twofactor_lockout.up,
    down: migration_20260727_twofactor_lockout.down,
    name: '20260727_twofactor_lockout',
  },
];
