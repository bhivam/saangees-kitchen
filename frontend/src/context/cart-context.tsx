import type { MenuItemSelection } from "@/hooks/use-menu-item-form";
import {
  addCartItemLS,
  getCartLS,
  removeCartItemBySkuLS,
  replaceCartItemLS,
  setCartLS,
  updateCartItemQuantityLS,
  type Cart,
} from "@/lib/cart";
import { createContext, useCallback, useState, type ReactNode } from "react";

export const CartContext = createContext<{
  cart: Cart;
  addCartItem: (itemSelection: MenuItemSelection) => void;
  setCart: (cart: Cart) => void;
  updateCartItemQuantity: (skuId: string, quantity: number) => void;
  removeCartItem: (skuId: string) => void;
  replaceCartItem: (oldSkuId: string, newSelection: MenuItemSelection) => void;
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

  const updateCartItemQuantity = useCallback(
    (skuId: string, quantity: number) => {
      updateCartItemQuantityLS(skuId, quantity);
      setCartState(getCartLS());
    },
    [setCartState],
  );

  const removeCartItem = useCallback(
    (skuId: string) => {
      removeCartItemBySkuLS(skuId);
      setCartState(getCartLS());
    },
    [setCartState],
  );

  const replaceCartItem = useCallback(
    (oldSkuId: string, newSelection: MenuItemSelection) => {
      replaceCartItemLS(oldSkuId, newSelection);
      setCartState(getCartLS());
    },
    [setCartState],
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addCartItem,
        setCart,
        updateCartItemQuantity,
        removeCartItem,
        replaceCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

