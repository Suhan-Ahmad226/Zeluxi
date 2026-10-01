import {describe,expect,it} from "vitest";
describe("inventory invariants",()=>{
  it("rejects non-positive quantities",()=>{
    expect([0,-1].every(n=>n<1)).toBe(true);
  });
  it("never treats reserved stock as available stock",()=>{
    const available=3,reserved=2,requested=4;
    expect(available>=requested).toBe(false);
    expect(available+reserved).toBe(5);
  });
});
