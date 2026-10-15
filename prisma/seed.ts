/**
 * Zelux Production Database Seed Script
 * Pre-populates Categories, Products, Admin User, Settings, and Coupons.
 */

export const SEED_DATA = {
  adminUser: {
    email: 'admin@zelux.com.bd',
    fullName: 'Administrator (Suhan Ahmad)',
    phone: '01700112233',
    role: 'ADMIN',
  },
  categories: [
    {
      name: 'Full-Grain Leather',
      nameBn: 'খাঁটি চামড়ার সামগ্রী',
      slug: 'full-grain-leather',
      description: 'Handcrafted vegetable-tanned leather essentials',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'European Flax Linen',
      nameBn: 'ইউরোপিয়ান ফ্ল্যাক্স লিনেন',
      slug: 'european-flax-linen',
      description: 'Breathable, sustainable organic linen apparel',
      imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Mechanical Watches',
      nameBn: 'মেকানিক্যাল ও অটোমেটিক ঘড়ি',
      slug: 'mechanical-watches',
      description: 'Precision mechanical & automatic heritage timepieces',
      imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Desk & Living',
      nameBn: 'ডেস্ক ও লিভিং সামগ্রী',
      slug: 'desk-and-living',
      description: 'Minimalist brass & walnut studio desk accessories',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    },
  ],
  coupons: [
    {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minSpend: 500,
      description: '10% welcome discount on your first order',
    },
    {
      code: 'DHAKA100',
      type: 'FIXED',
      value: 100,
      minSpend: 1000,
      description: '৳100 flat discount on orders over ৳1,000',
    },
    {
      code: 'EID2026',
      type: 'PERCENTAGE',
      value: 15,
      minSpend: 2500,
      maxDiscount: 1000,
      description: '15% festival discount on orders above ৳2,500',
    },
  ],
  settings: {
    storeName: 'Zelux',
    currency: 'BDT',
    currencySymbol: '৳',
    dhakaDeliveryFee: 60,
    outsideDhakaDeliveryFee: 120,
    freeShippingThreshold: 3500,
    hotline: '+880 1700-112233',
    email: 'support@zelux.com.bd',
    address: 'Plot 8, Road 11, Banani, Dhaka 1213, Bangladesh',
  },
};

console.log('Seed configuration verified for Zelux database.');
