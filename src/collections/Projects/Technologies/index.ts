import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ProjectsTechnologies: CollectionConfig<'projects-technologies'> = {
  slug: 'projects-technologies',
  access: {
    read: RBAC(allowAll(), [], 'projects-technologies', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'projects-technologies', 'admin'),
  },
  labels: {
    plural: 'Technologies',
    singular: 'Technology',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.projects,
    description: 'Technologies and frameworks used in projects (React, Node.js, TypeScript, etc.).',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'color',
      type: 'text',
      admin: {
        description: 'Hex color for this technology (e.g., #61dafb for React)',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional icon/logo for this technology',
      },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'Link to official site or documentation',
      },
    },
    ...slugField(),
  ],
};
