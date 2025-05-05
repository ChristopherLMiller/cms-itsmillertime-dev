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

  // If the user has showNSFW set to false, then filter those
  if (!req?.user?.showNSFW) {
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
};
