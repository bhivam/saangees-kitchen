import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import { addCartItemLS, getCartLS, type Cart } from "@/lib/cart";
import { createContext, useCallback, useState, type ReactNode } from "react";

export const CartContext = createContext<{
  cart: Cart;
  addCartItem: (itemSelection: MenuItemSelection) => void;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(getCartLS());

  const addCartItem = useCallback(
    (cartItem: MenuItemSelection) => {
      addCartItemLS(cartItem);
      const cart = getCartLS();

      setCart(cart);
    },
    [setCart],
  );

  return (
    <CartContext.Provider value={{ cart, addCartItem }}>
      {children}
    </CartContext.Provider>
  );
}

