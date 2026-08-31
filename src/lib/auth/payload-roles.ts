/** Payload `users.role` values (see Users collection). */
export const PAYLOAD_ROLES = ['admin', 'family', 'friend', 'client', 'user'] as const;

export type PayloadRole = (typeof PAYLOAD_ROLES)[number];

export function sortPayloadRoles(roles: PayloadRole[]): PayloadRole[] {
  const order = new Map(PAYLOAD_ROLES.map((role, index) => [role, index]));
  return [...roles].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}
