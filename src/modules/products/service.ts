import { db } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

export async function listPublishedProducts(input?: {
  categorySlug?: string;
  q?: string;
  take?: number;
  skip?: number;
}) {
  const q = input?.q?.trim();
  const take = Math.min(Math.max(input?.take ?? 24, 1), 48);
  const skip = Math.max(input?.skip ?? 0, 0);
  return db.product.findMany({
    where: {
      isPublished: true,
      ...(input?.categorySlug ? { categories: { some: { category: { slug: input.categorySlug, isActive: true } } } } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true } }, categories: { include: { category: true } }, inventory: true },
    orderBy: { createdAt: "desc" }, skip, take,
  });
}

export async function getPublishedProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, isPublished: true },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { include: { inventory: true } },
      categories: { include: { category: true } },
      inventory: true,
      reviews: { where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function adminListProducts() {
  return db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      inventory: true,
      variants: { include: { inventory: true } },
      categories: { include: { category: true } },
    },
  });
}

export async function createProduct(input: Prisma.ProductCreateInput) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({ data: input });
    await tx.inventory.create({ data: { productId: product.id, available: 0, reserved: 0, lowStockThreshold: 5 } });
    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { inventory: true, images: true, variants: { include: { inventory: true } }, categories: { include: { category: true } } },
    });
  });
}

export async function updateProduct(id: string, input: Prisma.ProductUpdateInput) {
  return db.product.update({
    where: { id }, data: input,
    include: { inventory: true, images: true, variants: { include: { inventory: true } }, categories: { include: { category: true } } },
  });
}

type ProductImageInput = { id?: string; url: string; altText?: string | null; sortOrder?: number };
type ProductVariantInput = { id?: string; sku: string; name: string; attributes?: unknown; price?: number | null; available?: number; lowStockThreshold?: number };

export async function updateProductCatalog(
  id: string,
  input: Prisma.ProductUpdateInput,
  images?: ProductImageInput[],
  variants?: ProductVariantInput[],
) {
  return db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: input });
    if (!images && !variants) return tx.product.findUniqueOrThrow({ where: { id }, include: { inventory: true, images: { orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true }, orderBy: { sku: "asc" } }, categories: { include: { category: true } } } });
    if (images) {
      const existingImages = await tx.productImage.findMany({ where: { productId: id } });
      const imageIds = new Set(images.filter((x) => x.id).map((x) => x.id!));
      for (const old of existingImages) if (!imageIds.has(old.id)) await tx.productImage.delete({ where: { id: old.id } });
      for (const [index, image] of images.entries()) {
        if (image.id) await tx.productImage.update({ where: { id: image.id }, data: { url: image.url, altText: image.altText ?? null, sortOrder: image.sortOrder ?? index } });
        else await tx.productImage.create({ data: { productId: id, url: image.url, altText: image.altText ?? null, sortOrder: image.sortOrder ?? index } });
      }
    }

    if (!variants) return tx.product.findUniqueOrThrow({ where: { id }, include: { inventory: true, images: { orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true }, orderBy: { sku: "asc" } }, categories: { include: { category: true } } } });
    const existingVariants = await tx.productVariant.findMany({ where: { productId: id }, include: { orderItems: { select: { id: true }, take: 1 }, cartItems: { select: { id: true }, take: 1 } } });
    const variantIds = new Set(variants.filter((x) => x.id).map((x) => x.id!));
    for (const old of existingVariants) {
      if (!variantIds.has(old.id)) {
        if (old.orderItems.length || old.cartItems.length) throw new Error(`Variant "${old.name}" has order/cart references and cannot be removed.`);
        await tx.inventory.deleteMany({ where: { variantId: old.id } });
        await tx.productVariant.delete({ where: { id: old.id } });
      }
    }
    for (const variant of variants) {
      if (!variant.sku.trim() || !variant.name.trim()) throw new Error("Variant name and SKU are required.");
      if (variant.id) {
        const current = existingVariants.find((x) => x.id === variant.id);
        if (!current) throw new Error("Invalid variant.");
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { sku: variant.sku.trim(), name: variant.name.trim(), attributes: variant.attributes ?? null, price: variant.price ?? null },
        });
        const inv = await tx.inventory.findUnique({ where: { variantId: variant.id } });
        const available = Math.max(0, Math.trunc(variant.available ?? inv?.available ?? 0));
        const threshold = Math.max(0, Math.trunc(variant.lowStockThreshold ?? inv?.lowStockThreshold ?? 5));
        if (inv) {
          if (available < inv.reserved) throw new Error(`Variant "${variant.name}" stock cannot be below reserved stock.`);
          await tx.inventory.update({ where: { id: inv.id }, data: { available, lowStockThreshold: threshold } });
        } else {
          await tx.inventory.create({ data: { variantId: variant.id, available, lowStockThreshold: threshold } });
        }
      } else {
        const created = await tx.productVariant.create({ data: { productId: id, sku: variant.sku.trim(), name: variant.name.trim(), attributes: variant.attributes ?? null, price: variant.price ?? null } });
        await tx.inventory.create({ data: { variantId: created.id, available: Math.max(0, Math.trunc(variant.available ?? 0)), lowStockThreshold: Math.max(0, Math.trunc(variant.lowStockThreshold ?? 5)) } });
      }
    }
    return tx.product.findUniqueOrThrow({ where: { id }, include: { inventory: true, images: { orderBy: { sortOrder: "asc" } }, variants: { include: { inventory: true }, orderBy: { sku: "asc" } }, categories: { include: { category: true } } } });
  });
}
