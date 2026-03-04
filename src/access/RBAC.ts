import { PayloadRequest, Where } from 'payload';

type AccessCheckFn = (args: { req: PayloadRequest }) => Promise<boolean>;
type FilterFn = (args: { req: PayloadRequest }) => Promise<Where>;

export function RBAC(
  accessFunction: AccessCheckFn,
  filters: FilterFn[] = [],
): (args: { req: PayloadRequest }) => Promise<boolean | Where> {
  return async ({ req }: { req: PayloadRequest }) => {
    // Step 1: Check that the user is even permitted to do this, if they aren't return false so we don't even have to run the filters
    const permitted = await accessFunction({ req });
    if (!permitted) return false;

    // Step 2: If thrre are no filters, just return true
    if (filters.length === 0) return true;

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

    // Step 4: If there are no wheres, just return true
    if (wheres.length === 0) return true;

    // Step 5: If there is one where, return it
    let finalWhere: Where;
    if (wheres.length === 1) {
      finalWhere = wheres[0];
    } else {
      // Step 6: If there are multiple wheres, return an and of them
      finalWhere = { and: wheres };
    }

    console.log('[RBAC] Individual filter outputs:', JSON.stringify(wheres, null, 2));
    console.log(
      '[RBAC] Final where clause (what Payload receives):',
      JSON.stringify(finalWhere, null, 2),
    );

    return wheres;
  };
}
