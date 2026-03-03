import { hasAllRoles, hasAnyRole } from '@delmaredigital/payload-better-auth';
import { PayloadRequest, Where } from 'payload';

export const nsfwFilter = async ({ req }: { req: PayloadRequest }): Promise<Where> => {
  console.log('[nsfwFilter] user:', req?.user ? { id: req.user.id, collection: req.user.collection, email: (req.user as any).email, displayName: (req.user as any).displayName } : 'none');
  // Don't show NSFW if the user isn't logged in
  if (!req?.user) {
    return {
      'settings.isNsfw': {
        not_equals: true,
      },
    };
  }

  // Check if the user if of type user
  if (req.user.collection === 'users') {
    // If the user is an admin, return all
    if (hasAnyRole(req.user, ['admin'])) {
      return {
        'settings.isNsfw': {
          in: [true, false, null], // all permutations
        },
      };
    }
    // Now lets check the user NSFW setting, if its hide, don't send, if its blur or show, send it along
    if (req.user.nsfwFiltering === 'hide') {
      return {
        'settings.isNsfw': {
          not_equals: true,
        },
      };
    } else {
      return {
        'settings.isNsfw': {
          in: [true, false, null], // all permutations
        },
      };
    }
  } else {
    // Must be a MCP API key, return all
    return {
      'settings.isNsfw': {
        in: [true, false, null], // all permutations
      },
    };
  }
};
