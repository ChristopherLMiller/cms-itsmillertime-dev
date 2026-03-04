import { hasAnyRole, normalizeRoles } from '@delmaredigital/payload-better-auth';
import { PayloadRequest, Where } from 'payload';

type FilterFn = ({ req }: { req: PayloadRequest }) => Promise<Where>;

const withFilter =
  (check: (args: { req: PayloadRequest }) => Promise<boolean>, filters: FilterFn[]) =>
  async ({ req }: { req: PayloadRequest }): Promise<boolean | Where> => {
    const permitted = await check({ req });
    if (!permitted) return false;

    const filterResults = await Promise.allSettled(filters.map((fn) => fn({ req })));
    const wheres: Where[] = filterResults
      .filter((r): r is PromiseFulfilledResult<Where> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((w) => Object.keys(w).length > 0);

    if (wheres.length === 0) return true;
    if (wheres.length === 1) return wheres[0];
    return { and: wheres };
  };

export function RBAC() {
  console.log('Creating RBAC instance');
  const api = {
    allowAll() {
      const check = async (_args: { req: PayloadRequest }) => true;
      return {
        ...api,
        result() {
          return check;
        },
        applyFilter(filters: FilterFn[]) {
          return {
            ...api,
            result() {
              return withFilter(check, filters);
            },
          };
        },
      };
    },

    allowedRoles(roles: string[]) {
      console.log('[allowedRoles] function executing');
      const check = async ({ req }: { req: PayloadRequest }) => {
        const ip =
          req?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ??
          req?.headers?.get?.('x-real-ip') ??
          'unknown';
        console.log('[allowedRoles.check] user:', req?.user?.id ?? 'anonymous', 'ip:', ip);
        if (req.user == null || req.user.collection !== 'users') return false;
        return hasAnyRole(req.user, normalizeRoles(roles));
      };
      return {
        ...api,
        result() {
          return check;
        },
        applyFilter(filters: FilterFn[]) {
          return {
            ...api,
            result() {
              return withFilter(check, filters);
            },
          };
        },
      };
    },

    result() {
      console.log('[result] function executing');
      return async (_args: { req: PayloadRequest }) => false;
    },
  };
  return api;
}
