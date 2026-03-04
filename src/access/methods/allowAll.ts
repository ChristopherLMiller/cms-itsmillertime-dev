import { PayloadRequest } from 'payload';

export async function allowAll({ req }: { req: PayloadRequest }) {
  return true;
}
