"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appRouter = void 0;
const __1 = require("..");
const menu_1 = require("./menu");
const menuItem_1 = require("./menuItem");
const modifierGroup_1 = require("./modifierGroup");
exports.appRouter = (0, __1.createTRPCRouter)({
    alive: __1.publicProcedure.query(() => "I'm alive!"),
    menuItems: menuItem_1.menuItemsRouter,
    menu: menu_1.menuRouter,
    modifierGroups: modifierGroup_1.modifierGroupsRouter,
});
