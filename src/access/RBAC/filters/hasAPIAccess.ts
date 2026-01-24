import { PayloadRequest } from 'payload';

export const hasAPIAccess = async ({ req }: { req: PayloadRequest }): Promise<boolean> => {
  if (req?.user) {
    return true;
  }
  return false;
};
