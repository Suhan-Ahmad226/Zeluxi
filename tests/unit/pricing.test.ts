import {describe,expect,it} from "vitest";
import {Prisma} from "@prisma/client";
describe("checkout money arithmetic",()=>{
  it("keeps decimal arithmetic exact",()=>{
    const subtotal=new Prisma.Decimal("999.99").mul(2);
    const discount=new Prisma.Decimal("100");
    const shipping=new Prisma.Decimal("80");
    expect(subtotal.sub(discount).add(shipping).toString()).toBe("1979.98");
  });
  it("does not allow discount above subtotal",()=>{
    const subtotal=new Prisma.Decimal("500");
    const discount=Prisma.Decimal.min(new Prisma.Decimal("700"),subtotal);
    expect(discount.toString()).toBe("500");
  });
});
