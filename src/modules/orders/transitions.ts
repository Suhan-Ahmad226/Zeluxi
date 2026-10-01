import {OrderStatus} from "@prisma/client";
const transitions:Record<OrderStatus,OrderStatus[]>={
PENDING:[OrderStatus.CONFIRMED,OrderStatus.CANCELLED],
CONFIRMED:[OrderStatus.PROCESSING,OrderStatus.CANCELLED],
PROCESSING:[OrderStatus.READY_TO_SHIP,OrderStatus.CANCELLED],
READY_TO_SHIP:[OrderStatus.SHIPPED],
SHIPPED:[OrderStatus.OUT_FOR_DELIVERY,OrderStatus.RETURN_REQUESTED],
OUT_FOR_DELIVERY:[OrderStatus.DELIVERED,OrderStatus.RETURN_REQUESTED],
DELIVERED:[OrderStatus.RETURN_REQUESTED],
CANCELLED:[],RETURN_REQUESTED:[OrderStatus.RETURNED],
RETURNED:[OrderStatus.REFUNDED],REFUNDED:[]
};
export function canTransition(from:OrderStatus,to:OrderStatus){return transitions[from].includes(to);}
export function assertTransition(from:OrderStatus,to:OrderStatus){if(!canTransition(from,to))throw new Error(`Invalid order status transition: ${from} → ${to}`);}
