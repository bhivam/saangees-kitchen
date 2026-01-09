import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import { addCartItemLS, getCartLS, setCartLS, type Cart } from "@/lib/cart";
import { createContext, useCallback, useState, type ReactNode } from "react";

export const CartContext = createContext<{
  cart: Cart;
  addCartItem: (itemSelection: MenuItemSelection) => void;
  setCart: (cart: Cart) => void;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCartState] = useState<Cart>(getCartLS());

  const addCartItem = useCallback(
    (cartItem: MenuItemSelection) => {
      addCartItemLS(cartItem);
      const cart = getCartLS();

      setCartState(cart);
    },
    [setCartState],
  );

  const setCart = useCallback(
    (cart: Cart) => {
      setCartLS(cart);
      setCartState(cart);
    },
    [setCartState],
  );

  return (
    <CartContext.Provider value={{ cart, addCartItem, setCart }}>
      {children}
    </CartContext.Provider>
  );
}

