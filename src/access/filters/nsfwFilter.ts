import { hasAllRoles } from '@delmaredigital/payload-better-auth';
import { PayloadRequest, Where } from 'payload';

export const nsfwFilter = async ({ req }: { req: PayloadRequest }): Promise<Where> => {
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
    if (hasAllRoles(req.user, ['admin'])) {
      return {
        'settings.isNsfw': {
          in: [true, false, null], // all permutations
        },
      };
    }
    // If the user has showNSFW set to false, then filter those
    if (!req.user.showNSFW) {
      return {
        'settings.isNsfw': {
          not_equals: true,
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

  // Default to filter out all NSFW
  return {
    'settings.isNsfw': {
      not_equals: true,
    },
  };
};
