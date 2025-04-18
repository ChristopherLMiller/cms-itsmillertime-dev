import { Collection, OperationKey } from '@/lib/PermissionsManager';
import { Role } from '@/payload-types';
import { PayloadRequest } from 'payload';

export function RBAC(collection: Collection['slug']) {
  const getDefaultRole = async (req: PayloadRequest): Promise<Role> => {
    const defaultRole = await req?.payload.find({
      collection: 'roles',
      where: { isDefault: { equals: true } },
    });
    return defaultRole.docs[0];
  };
  const getApplicableRoles = async (req: PayloadRequest): Promise<Role[]> => {
    const allRoles = [];

    // First push the default role onto the roles
    allRoles.push(await getDefaultRole(req));

    // First check for user, and then push default role or the users role
    if (req.user !== null) {
      allRoles.push(...req.user?.roles);
    }

    const roleIDs = allRoles.map((role) => {
      if (typeof role === 'object') {
        return role.id;
      }
      return role;
    });

    const { docs: roles } = await req.payload.find({
      collection: 'roles',
      where: { id: { in: roleIDs } },
    });

    return roles;
  };

  const isAuthorized = async (operation: OperationKey, req: PayloadRequest): Promise<boolean> => {
    const userRoles = await getApplicableRoles(req);
    const rolePermissions = userRoles.map((role) => role.permissions);

    try {
      let isAuthorized = false;
      rolePermissions.forEach((permissionNode) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (permissionNode[collection] && permissionNode[collection][operation] === true) {
          isAuthorized = true;
        }
      });

      return isAuthorized;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const read = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('read', req);
  };

  const create = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('create', req);
  };

  const update = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('update', req);
  };

  const remove = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('delete', req);
  };

  const unlock = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('unlock', req);
  };

  const readVersions = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('readVersions', req);
  };

  const admin = async ({ req }: { req: PayloadRequest }) => {
    return isAuthorized('admin', req);
  };

  return { read, create, update, remove, unlock, readVersions, admin };
}
