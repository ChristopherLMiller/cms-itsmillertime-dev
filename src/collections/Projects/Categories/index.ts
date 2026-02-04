import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ProjectsCategories: CollectionConfig<'projects-categories'> = {
  slug: 'projects-categories',
  access: RBAC('projects-categories'),
  labels: {
    plural: 'Categories',
    singular: 'Category',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.projects,
    description: 'Project categories. Used for classifying project types (Web App, CLI, Library, etc.).',
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
