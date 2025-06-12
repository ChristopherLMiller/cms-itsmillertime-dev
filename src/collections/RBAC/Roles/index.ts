import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { permissionsField } from '@/fields/Permissions';
import { CollectionConfig } from 'payload';

export const Roles: CollectionConfig<'roles'> = {
  slug: 'roles',
  access: RBAC('roles'),
  admin: {
    useAsTitle: 'name',
    group: Groups.authentication,
    description: 'User roles and permissions',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
        },
        {
          name: 'description',
          type: 'text',
        },
      ],
    },
    {
      name: 'isDefault',
      type: 'checkbox',
      label: 'Is the default role',
      defaultValue: false,
    },
    ...permissionsField(),
  ],
};
