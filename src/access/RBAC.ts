import { PayloadRequest, Where } from 'payload';

type AccessCheckFn = (args: { req: PayloadRequest }) => Promise<boolean>;
type FilterFn = (args: { req: PayloadRequest }) => Promise<Where>;

export function RBAC(
  accessFunction: AccessCheckFn,
  filters?: [],
  collection?: string,
  operation?: string,
): (args: { req: PayloadRequest }) => Promise<boolean>;
export function RBAC(
  accessFunction: AccessCheckFn,
  filters: [FilterFn, ...FilterFn[]],
  collection?: string,
  operation?: string,
): (args: { req: PayloadRequest }) => Promise<boolean | Where>;
export function RBAC(
  accessFunction: AccessCheckFn,
  filters: FilterFn[] = [],
  collection?: string,
  operation?: string,
): (args: { req: PayloadRequest }) => Promise<boolean | Where> {
  return async ({ req }: { req: PayloadRequest }) => {
    console.log(`==================== START ====================`);
    console.log(
      `[RBAC] ${collection ?? 'unknown'}:${operation ?? 'unknown'} | accessFunction: ${accessFunction.name} | filters: ${filters.map((f) => f.name).join(', ')}`,
    );
    // Step 1: Check that the user is even permitted to do this, if they aren't return false so we don't even have to run the filters
    const permitted = await accessFunction({ req });
    console.log('[RBAC] permitted:', permitted);
    if (!permitted) {
      console.log('[RBAC] Not permitted, returning false');
      console.log(`===================== END =====================`);
      return false;
    }

    // Step 2: If thrre are no filters, just return true
    if (filters.length === 0) {
      console.log('[RBAC] No filters, returning true');
      console.log(`===================== END =====================`);
      return true;
    }

    // Step 3: If there are filters, run them
    const filterResults = await Promise.allSettled(filters.map((fn) => fn({ req })));
    const rejected = filterResults.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      console.log(
        '[RBAC] Rejected filters:',
        rejected.map((r) => (r as PromiseRejectedResult).reason),
      );
    }
    const wheres: Where[] = filterResults
      .filter((r): r is PromiseFulfilledResult<Where> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((w) => Object.keys(w).length > 0);

    // Log each filter's output separately
    filterResults.forEach((result, i) => {
      const filterName = filters[i]?.name ?? `filter[${i}]`;
      if (result.status === 'fulfilled') {
        console.log(`[RBAC] ${filterName} output:`, JSON.stringify(result.value, null, 2));
      } else {
        console.log(`[RBAC] ${filterName} rejected:`, (result as PromiseRejectedResult).reason);
      }
    });

    // Step 4: If there are no wheres, just return true
    if (wheres.length === 0) return true;

    // Step 5: If there is one where, return it
    let resultingWhere: Where;
    resultingWhere = { and: [...wheres] };

    //console.log('[RBAC] Individual filter outputs:', JSON.stringify(wheres, null, 2));
    //console.log(
    //  '[RBAC] Final where clause (what Payload receives):',
    //  JSON.stringify(resultingWhere, null, 2),
    //);

    console.log(
      '[RBAC] Final where clause (what Payload receives):',
      JSON.stringify(resultingWhere, null, 2),
    );
    console.log(`===================== END =====================`);

    return resultingWhere;
  };
}
