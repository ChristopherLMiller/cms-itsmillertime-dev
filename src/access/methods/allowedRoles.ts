import { hasAnyRole } from '@delmaredigital/payload-better-auth';
import { PayloadRequest } from 'payload';

export async function allowedRoles({ req, roles = [] }: { req: PayloadRequest; roles?: string[] }) {
  // If not user, not logged in, just return false
  if (req.user == null) return false;

  // If the user is present, and is the MCP just return
  if (req.user.collection === 'payload-mcp-api-keys') return true;

  // Use better-auth method to check if the user has any of the roles
  return hasAnyRole(req?.user, roles);
}
