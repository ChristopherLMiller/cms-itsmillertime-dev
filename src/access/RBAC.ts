import { PayloadRequest, Where } from 'payload';

type AccessCheckFn = (args: { req: PayloadRequest }) => Promise<boolean>;
type FilterFn = (args: { req: PayloadRequest }) => Promise<Where>;

export function RBAC(
  accessFunction: AccessCheckFn,
  filters: FilterFn[] = [],
): (args: { req: PayloadRequest }) => Promise<boolean> {
  return async ({ req }: { req: PayloadRequest }) => {
    return accessFunction({ req });
  };
}
