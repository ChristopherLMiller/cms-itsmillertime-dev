import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { CollectionConfig } from 'payload';

export const Projects: CollectionConfig<'projects'> = {
  slug: 'projects',
  access: RBAC('projects'),
  labels: {
    singular: 'Project',
    plural: 'Projects',
  },
  enableQueryPresets: true,
  trash: true,
  defaultPopulate: {
    title: true,
    slug: true,
    shortDescription: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'projectStatus', 'category', 'featured', 'updatedAt'],
    useAsTitle: 'title',
    description: 'Coding projects and portfolio items',
    group: Groups.projects,
    enableRichTextLink: true,
    components: {
      edit: {
        beforeDocumentControls: [
          {
            path: '@/components/PreviewButton#PreviewButton',
          },
        ],
      },
    },
  },
  fields: [
    ...slugField('title'),
    // Sidebar fields
    {
      name: 'projectStatus',
      type: 'select',
      required: true,
      defaultValue: 'inProgress',
      label: 'Status',
      options: [
        { label: 'In Progress', value: 'inProgress' },
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Archived', value: 'archived' },
        { label: 'Experimental', value: 'experimental' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Highlight this project on the homepage',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'projects-categories',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'technologies',
      type: 'relationship',
      relationTo: 'projects-technologies',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'version',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Current version (e.g., 1.2.0, v2.0.0-beta)',
      },
    },
    {
      name: 'license',
      type: 'select',
      options: [
        { label: 'MIT', value: 'MIT' },
        { label: 'Apache 2.0', value: 'Apache-2.0' },
        { label: 'GPL 3.0', value: 'GPL-3.0' },
        { label: 'BSD 3-Clause', value: 'BSD-3-Clause' },
        { label: 'ISC', value: 'ISC' },
        { label: 'Proprietary', value: 'Proprietary' },
        { label: 'Unlicensed', value: 'Unlicensed' },
        { label: 'Other', value: 'Other' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Creator', value: 'creator' },
        { label: 'Maintainer', value: 'maintainer' },
        { label: 'Contributor', value: 'contributor' },
        { label: 'Collaborator', value: 'collaborator' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    // Related Resources group
    {
      type: 'group',
      name: 'relatedResources',
      label: 'Related Resources',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'relatedPosts',
          type: 'relationship',
          hasMany: true,
          relationTo: 'posts',
        },
        {
          name: 'relatedProjects',
          type: 'relationship',
          hasMany: true,
          relationTo: 'projects',
          filterOptions: ({ id }) => {
            return {
              id: {
                not_in: [id],
              },
            };
          },
        },
      ],
    },
    // Tabs
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'shortDescription',
              type: 'textarea',
              required: true,
              admin: {
                description: 'A brief one-liner description for cards and listings',
              },
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [...rootFeatures];
                },
              }),
            },
          ],
        },
        {
          label: 'Links',
          fields: [
            {
              name: 'links',
              type: 'array',
              admin: {
                description: 'External links related to this project',
                initCollapsed: true,
                components: {
                  RowLabel: {
                    path: '@/components/RowLabel#RowLabel',
                  },
                },
              },
              fields: [
                {
                  name: 'type',
                  type: 'select',
                  required: true,
                  defaultValue: 'github',
                  options: [
                    { label: 'GitHub', value: 'github' },
                    { label: 'Live Site', value: 'live' },
                    { label: 'NPM', value: 'npm' },
                    { label: 'Documentation', value: 'docs' },
                    { label: 'Custom', value: 'custom' },
                  ],
                },
                {
                  name: 'url',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Full URL including https://',
                  },
                },
                {
                  name: 'label',
                  type: 'text',
                  admin: {
                    description: 'Custom label for this link',
                    condition: (data, siblingData) => siblingData?.type === 'custom',
                  },
                },
                {
                  name: 'color',
                  type: 'text',
                  admin: {
                    description: 'Hex color for this link (e.g., #ff5500)',
                    condition: (data, siblingData) => siblingData?.type === 'custom',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Gallery',
          fields: [
            {
              name: 'screenshots',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              admin: {
                description: 'Screenshots and images showcasing the project',
              },
            },
          ],
        },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 5,
  },
};
