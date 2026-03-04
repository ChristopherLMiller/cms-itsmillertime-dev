import { PayloadRequest } from 'payload';

export function allowAll() {
  return async ({ req }: { req: PayloadRequest }) => true;
}
