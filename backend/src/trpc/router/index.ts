import { createTRPCRouter, publicProcedure } from "..";
import { menuItemsRouter } from "./menuItem";
import { modifierGroupsRouter } from "./modifierGroup";

export const appRouter = createTRPCRouter({
  alive: publicProcedure.query(() => "I'm alive!"),
  menuItems: menuItemsRouter,
  modifierGroups: modifierGroupsRouter
});

