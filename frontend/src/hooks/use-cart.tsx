import { CartContext } from "@/context/cart-context";
import { useContext } from "react";

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("Cart Provider not initialized");
  }

  return context;
}

