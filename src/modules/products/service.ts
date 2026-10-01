import {db} from "@/lib/db/client";

export async function listPublishedProducts(input?: {categorySlug?: string; q?: string; take?: number}) {
  const q=input?.q?.trim();
  return db.product.findMany({
    where:{
      isPublished:true,
      ...(input?.categorySlug?{categories:{some:{category:{slug:input.categorySlug,isActive:true}}}}:{}),
      ...(q?{OR:[
        {name:{contains:q,mode:"insensitive"}},
        {sku:{contains:q,mode:"insensitive"}},
        {brand:{contains:q,mode:"insensitive"}},
        {shortDescription:{contains:q,mode:"insensitive"}},
      ]}:{}),
    },
    include:{images:{orderBy:{sortOrder:"asc"}},variants:true,categories:{include:{category:true}},inventory:true},
    orderBy:{createdAt:"desc"},
    take:Math.min(Math.max(input?.take??24,1),48),
  });
}

export async function getPublishedProduct(slug:string) {
  return db.product.findFirst({
    where:{slug,isPublished:true},
    include:{images:{orderBy:{sortOrder:"asc"}},variants:{include:{inventory:true}},categories:{include:{category:true}},inventory:true,reviews:{where:{isPublished:true},orderBy:{createdAt:"desc"},take:10}},
  });
}