/**
 * Production database seed is intentionally not configured.
 *
 * Do not seed fake customers, admin identities, products, orders, payment records,
 * coupons, or courier tracking events into a production database. Add a reviewed,
 * environment-specific seed script only after the real Prisma persistence layer and
 * trusted admin-provisioning workflow are implemented.
 */
export const SEED_DATA = {
  adminUser: null,
  categories: [],
  products: [],
  orders: [],
  coupons: [],
  settings: null,
};

console.info('No demo seed data is configured.');
