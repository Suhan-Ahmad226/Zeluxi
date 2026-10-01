import {describe,expect,it} from "vitest";
import {assertTransition,canTransition,allowedNextStatuses} from "@/modules/orders/transitions";
import {OrderStatus} from "@prisma/client";

describe("order transitions",()=>{
  it("allows the normal fulfillment lifecycle",()=>{
    expect(canTransition(OrderStatus.PENDING,OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.CONFIRMED,OrderStatus.PROCESSING)).toBe(true);
    expect(canTransition(OrderStatus.PROCESSING,OrderStatus.READY_TO_SHIP)).toBe(true);
    expect(canTransition(OrderStatus.READY_TO_SHIP,OrderStatus.SHIPPED)).toBe(true);
    expect(canTransition(OrderStatus.SHIPPED,OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY,OrderStatus.DELIVERED)).toBe(true);
  });
  it("rejects invalid jumps",()=>{
    expect(canTransition(OrderStatus.PENDING,OrderStatus.DELIVERED)).toBe(false);
    expect(()=>assertTransition(OrderStatus.PENDING,OrderStatus.DELIVERED)).toThrow();
  });
  it("does not allow a refunded order to move again",()=>{
    expect(allowedNextStatuses(OrderStatus.REFUNDED)).toEqual([]);
  });
});
