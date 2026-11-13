import { RBAC } from '@/access/RBAC';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { APIError, CollectionBeforeChangeHook, CollectionConfig } from 'payload';
import { recomputeTotalAfterChange, recomputeTotalAfterDelete } from './hooks/recomputeModelTotal';

export const TIME_ENTRY_SOURCES = ['timer', 'manual', 'imported'] as const;

/**
 * Derive `durationSeconds` from the timestamps so it is never trusted from the
 * client. Imported totals (e.g. carried over from Clockify) have no timestamps
 * and keep their stored duration.
 */
const computeDuration: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const merged = { ...originalDoc, ...data };
  const source = merged.source ?? 'timer';

  if (source === 'imported') {
    const seconds = Number(merged.durationSeconds);
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new APIError('Imported entries need a non-negative durationSeconds.', 400);
    }
    data.durationSeconds = Math.floor(seconds);
    return data;
  }

  if (!merged.startedAt) {
    throw new APIError('A start time is required.', 400);
  }
  const startMs = Date.parse(merged.startedAt);
  if (Number.isNaN(startMs)) throw new APIError('Invalid start time.', 400);

  if (!merged.stoppedAt) {
    data.durationSeconds = null;
    return data;
  }
  const stopMs = Date.parse(merged.stoppedAt);
  if (Number.isNaN(stopMs)) throw new APIError('Invalid stop time.', 400);
  if (stopMs < startMs) throw new APIError('Stop time must be after the start time.', 400);

  data.durationSeconds = Math.floor((stopMs - startMs) / 1000);
  return data;
};

export const ModelTimeEntries: CollectionConfig<'model-time-entries'> = {
  slug: 'model-time-entries',
  labels: {
    singular: 'Time Entry',
    plural: 'Time Entries',
  },
  access: {
    read: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'delete'),
    unlock: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'model-time-entries', 'admin'),
  },
  admin: {
    group: Groups.models,
    description: 'Time tracked against a model. Start and stop timers from the model page.',
    defaultColumns: ['model', 'startedAt', 'stoppedAt', 'durationSeconds', 'source'],
    listSearchableFields: ['note'],
  },
  defaultSort: '-startedAt',
  hooks: {
    beforeChange: [computeDuration],
    afterChange: [recomputeTotalAfterChange],
    afterDelete: [recomputeTotalAfterDelete],
  },
  fields: [
    {
      name: 'model',
      type: 'relationship',
      relationTo: 'models',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startedAt',
          type: 'date',
          label: 'Started',
          index: true,
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            condition: (data) => data?.source !== 'imported',
          },
        },
        {
          name: 'stoppedAt',
          type: 'date',
          label: 'Stopped',
          admin: {
            date: { pickerAppearance: 'dayAndTime' },
            description: 'Empty while the timer is running.',
            condition: (data) => data?.source !== 'imported',
          },
        },
      ],
    },
    {
      name: 'durationSeconds',
      type: 'number',
      label: 'Duration',
      min: 0,
      admin: {
        readOnly: true,
        description: 'Worked out from the start and stop times.',
        components: {
          Cell: '@/components/ModelTimeTracker/DurationCell#DurationCell',
        },
      },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'timer',
      options: [
        { label: 'Timer', value: 'timer' },
        { label: 'Manual', value: 'manual' },
        { label: 'Imported total', value: 'imported' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'note',
      type: 'text',
    },
  ],
};
