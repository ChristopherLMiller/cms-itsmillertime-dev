import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ProjectsCategories: CollectionConfig<'projects-categories'> = {
  slug: 'projects-categories',
  access: {
    read: RBAC(allowAll(), [], 'projects-categories', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'projects-categories', 'admin'),
  },
  labels: {
    plural: 'Categories',
    singular: 'Category',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.projects,
    description:
      'Project categories. Used for classifying project types (Web App, CLI, Library, etc.).',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of this category',
      },
    },
    ...slugField(),
  ],
};
