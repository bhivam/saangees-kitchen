import z from "zod";
import { createTRPCRouter, protectedProcedure } from "..";

export const ordersRouter = createTRPCRouter({
  createOrder: protectedProcedure
    .input(z.object({}))
    .mutation(({ input }) => {}),
});

