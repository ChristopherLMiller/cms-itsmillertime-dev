import { PayloadRequest, Where } from 'payload';

export const visibilityFilter = async ({ req }: { req: PayloadRequest }): Promise<Where> => {
  // if we are on the local API allow it (admin)
  if (req.payloadAPI === 'local') {
    return {
      'settings.visibility': {
        in: ['ALL', 'AUTHENTICATED', 'PRIVILEGED'],
      },
    };
  }

  // If user the user isn't logged in, return with filter for just all only
  if (req?.user === null) {
    return {
      'settings.visibility': {
        equals: 'ALL',
      },
    };
  }

  // If the user is logged in, we can return all, authenticated, and privileged
  // but privileged only where they are allowed via allowedRoles or allowedUsers
  const query: Where = {
    or: [
      {
        'settings.visibility': {
          in: ['ALL', 'AUTHENTICATED'],
        },
      },
      {
        and: [
          {
            'settings.visibility': {
              equals: 'PRIVILEGED',
            },
          },
          {
            or: [
              {
                'settings.allowedRoles.id': {
                  in: req?.user?.roles.map((role) => (typeof role === 'object' ? role.id : role)),
                },
              },
              {
                'settings.allowedUsers.id': {
                  in: [req?.user?.id],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  return query;
};
