import { createTRPCRouter, publicProcedure } from "../index.js";
import { menuRouter } from "./menu.js";
import { menuItemsRouter } from "./menuItem.js";
import { modifierGroupsRouter } from "./modifierGroup.js";
import { ordersRouter } from "./order.js";
import { usersRouter } from "./users.js";

export const appRouter = createTRPCRouter({
  alive: publicProcedure.query(() => "I'm alive!"),
  menuItems: menuItemsRouter,
  menu: menuRouter,
  modifierGroups: modifierGroupsRouter,
  orders: ordersRouter,
  users: usersRouter,
});

