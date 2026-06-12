import * as migration_20260612_072836_better_auth_1_6 from './20260612_072836_better_auth_1_6';

export const migrations = [
  {
    up: migration_20260612_072836_better_auth_1_6.up,
    down: migration_20260612_072836_better_auth_1_6.down,
    name: '20260612_072836_better_auth_1_6'
  },
];
