import { JSONField } from 'payload'

export const permissionsField = () => {
  const field: JSONField = {
    name: 'permissions',
    type: 'json',
    admin: {
      components: {
        Field: {
          path: '@/fields/Permissions/PermissionsTableServer#PermissionsTableServer',
          clientProps: {},
        },
      },
    },
  }

  return [field]
}
