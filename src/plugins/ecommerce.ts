import { ecommercePlugin as payloadEcommercePlugin } from '@payloadcms/plugin-ecommerce';

// Example access control functions (replace with your actual implementations)
const adminOnly = () => true;
const adminOnlyFieldAccess = () => true;
const adminOrCustomerOwner = () => true;
const adminOrPublishedStatus = () => true;
const customerOnlyFieldAccess = () => true;

export function ecommercePlugin() {
  return payloadEcommercePlugin({
    access: {
      adminOnly,
      adminOnlyFieldAccess,
      adminOrCustomerOwner,
      adminOrPublishedStatus,
      customerOnlyFieldAccess,
    },
    customers: { slug: 'users' },
  });
}
