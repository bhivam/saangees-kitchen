import { createTRPCRouter, publicProcedure } from "..";
import { menuRouter } from "./menu";
import { menuItemsRouter } from "./menuItem";
import { modifierGroupsRouter } from "./modifierGroup";

export const appRouter = createTRPCRouter({
  alive: publicProcedure.query(() => "I'm alive!"),
  menuItems: menuItemsRouter,
  menu: menuRouter,
  modifierGroups: modifierGroupsRouter,
});
