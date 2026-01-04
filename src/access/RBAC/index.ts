import { Collection, OperationKey } from '@/lib/PermissionsManager';
import { Role } from '@/payload-types';
import { PayloadRequest, Where } from 'payload';

export const RBAC = (collection: Collection['slug']) => {
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
    // Only check roles for User type, not PayloadMcpApiKey
    if (req.user !== null) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - req.user.roles may exist but not in types
      allRoles.push(...req.user.roles);
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
    const userRoles = await getApplicableRoles(req); // Get all the roles of the request user (typically default role + user's assigned roles)

    // Map over all roles to extract their permissions objects
    // If userRoles has 2 items, rolePermissions will have 2 permission objects
    const rolePermissions = userRoles.map((role) => role.permissions);

    try {
      let isAuthorized = false; // Default to false

      // Extract collection-specific permissions from each permission node
      const collectionPerms = rolePermissions.map((permissionNode) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return permissionNode[collection];
      });

      // Check if any of the collection permissions allow the operation
      collectionPerms.forEach((collectionPerm) => {
        if (collectionPerm && collectionPerm[operation] === true) {
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

  const operations = { read, create, update, remove, unlock, readVersions, admin };

  const applyFilters = (
    operation: keyof typeof operations,
    filters: Array<({ req }: { req: PayloadRequest }) => Promise<Where>>,
  ) => {
    return async ({ req }: { req: PayloadRequest }) => {
      // Frist run the operation to check if permitted or not at a role level
      const operationFunction = operations[operation];
      const operationResult = await operationFunction({ req });

      // If the operation result was true, we can run the filters on the data
      if (operationResult) {
        // Now run the filters
        const functionPromises = filters.map((func) => func({ req }));
        const filterResults = await Promise.allSettled(functionPromises);

        const queryFilter: Where = {
          and: filterResults.map((result) => (result.status === 'fulfilled' ? result.value : {})),
        };
        return queryFilter;
      } else {
        return operationResult;
      }
    };
  };

  return {
    ...operations,
    applyFilters,
  };
};
