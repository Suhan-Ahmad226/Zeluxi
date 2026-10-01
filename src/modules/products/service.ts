import { db } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

export async function listPublishedProducts(input?: {categorySlug?:string;q?:string;take?:number;skip?:number}) {
  const q=input?.q?.trim();
  const take=Math.min(Math.max(input?.take??24,1),48);
  const skip=Math.max(input?.skip??0,0);
  return db.product.findMany({
    where:{
      isPublished:true,
      ...(input?.categorySlug?{categories:{some:{category:{slug:input.categorySlug,isActive:true}}}}:{}),
      ...(q?{OR:[{name:{contains:q,mode:"insensitive"}},{sku:{contains:q,mode:"insensitive"}},{brand:{contains:q,mode:"insensitive"}},{shortDescription:{contains:q,mode:"insensitive"}}]}:{})
    },
    include:{images:{orderBy:{sortOrder:"asc"}},variants:{include:{inventory:true}},categories:{include:{category:true}},inventory:true},
    orderBy:{createdAt:"desc"},skip,take
  });
}
export async function getPublishedProduct(slug:string) {
  return db.product.findFirst({where:{slug,isPublished:true},include:{images:{orderBy:{sortOrder:"asc"}},variants:{include:{inventory:true}},categories:{include:{category:true}},inventory:true,reviews:{where:{isPublished:true},orderBy:{createdAt:"desc"},take:10}});
}
export async function adminListProducts(){
  return db.product.findMany({orderBy:{createdAt:"desc"},include:{images:{orderBy:{sortOrder:"asc"},take:1},inventory:true,variants:{include:{inventory:true}},categories:{include:{category:true}}});
}
export async function createProduct(input:Prisma.ProductCreateInput){
  return db.$transaction(async tx=>{
    const product=await tx.product.create({data:input});
    await tx.inventory.create({data:{productId:product.id,available:0,reserved:0,lowStockThreshold:5}});
    return tx.product.findUniqueOrThrow({where:{id:product.id},include:{inventory:true,images:true,variants:{include:{inventory:true}},categories:{include:{category:true}}});
  });
}
export async function updateProduct(id:string,input:Prisma.ProductUpdateInput){
  return db.$transaction(async tx=>tx.product.update({where:{id},data:input,include:{inventory:true,images:true,variants:{include:{inventory:true}},categories:{include:{category:true}}}));
}
