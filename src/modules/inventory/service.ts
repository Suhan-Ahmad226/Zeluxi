import {db} from "@/lib/db/client";
export async function reserveStock(tx:any,inventoryId:string,quantity:number){
 const result=await tx.inventory.updateMany({where:{id:inventoryId,available:{gte:quantity}},data:{available:{decrement:quantity},reserved:{increment:quantity}}});
 if(result.count!==1)throw new Error("Insufficient stock.");
}
export async function releaseReservedStock(inventoryId:string,quantity:number){
 if(quantity<1)throw new Error("Invalid quantity.");
 return db.$transaction(async tx=>{
  const result=await tx.inventory.updateMany({where:{id:inventoryId,reserved:{gte:quantity}},data:{available:{increment:quantity},reserved:{decrement:quantity}}});
  if(result.count!==1)throw new Error("Reserved stock is insufficient.");
  return result;
 });
}
export async function confirmReservedStock(inventoryId:string,quantity:number){
 if(quantity<1)throw new Error("Invalid quantity.");
 return db.$transaction(async tx=>{
  const result=await tx.inventory.updateMany({where:{id:inventoryId,reserved:{gte:quantity}},data:{reserved:{decrement:quantity}}});
  if(result.count!==1)throw new Error("Reserved stock is insufficient.");
  return result;
 });
}
