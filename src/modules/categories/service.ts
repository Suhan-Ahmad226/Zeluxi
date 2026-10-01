import {db} from "@/lib/db/client";
export async function listActiveCategories(){return db.category.findMany({where:{isActive:true},orderBy:{name:"asc"},include:{_count:{select:{products:true}}}});}
export async function getCategoryBySlug(slug:string){return db.category.findFirst({where:{slug,isActive:true},include:{products:{include:{product:{include:{images:{orderBy:{sortOrder:"asc"}},inventory:true}}}}}});}
