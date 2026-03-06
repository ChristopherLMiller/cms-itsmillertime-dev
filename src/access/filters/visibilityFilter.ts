import { PayloadRequest, Where } from 'payload';

export const visibilityFilter = async ({ req }: { req: PayloadRequest }): Promise<Where> => {
  // if we are on the local API allow it (admin) or its MCP
  if (req.payloadAPI === 'local' || req.user?.collection === 'payload-mcp-api-keys') {
    return {
      'settings.visibility': {
        in: ['ALL', 'AUTHENTICATED', 'PRIVILEGED'],
      },
    };
  }

  // If the user isn't logged in, return with filter for just all only
  if (!req?.user) {
    return {
      'settings.visibility': {
        equals: 'ALL',
      },
    };
  }

  // If the user is authenticated, we can return items marked with visibility of ALL or AUTHENTICATED.
  // In addition, we check if the user is in the permittedRoles or allowedUsers or both lists.
  const privilegedConditions: Where[] = [
    // User's role is in permittedRoles (only for users collection)
    ...(req.user.collection === 'users' &&
    Array.isArray(req.user.role) &&
    req.user.role.length > 0
      ? [
          {
            'settings.permittedRoles': {
              in: req.user.role,
            },
          },
        ]
      : []),
    // User's id is in allowedUsers
    ...(req.user.id
      ? [
          {
            'settings.allowedUsers': {
              equals: req.user.id,
            },
          },
        ]
      : []),
  ];

  const query: Where = {
    or: [
      {
        'settings.visibility': {
          in: ['ALL', 'AUTHENTICATED'],
        },
      },
      ...(privilegedConditions.length > 0
        ? [
            {
              and: [
                {
                  'settings.visibility': {
                    equals: 'PRIVILEGED',
                  },
                },
                {
                  or: privilegedConditions,
                },
              ],
            },
          ]
        : []),
    ],
  };
  return query;
};
