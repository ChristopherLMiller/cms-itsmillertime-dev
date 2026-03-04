import { hasAnyRole } from '@delmaredigital/payload-better-auth';
import { PayloadRequest } from 'payload';

export function allowedRoles(roles: string[]) {
  return async ({ req }: { req: PayloadRequest }) => {
    if (req.user == null) return false;
    if (req.user.collection === 'payload-mcp-api-keys') return true;
    return hasAnyRole(req?.user, roles);
  };
}
