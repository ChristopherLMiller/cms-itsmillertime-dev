import { PayloadRequest } from 'payload';

export const testFilter = async ({ req }: { req: PayloadRequest }) => {
  console.log(req.user);
  return {};
};
