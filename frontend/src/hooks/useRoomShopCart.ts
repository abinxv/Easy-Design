import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  clearRoomShopCart,
  fetchRoomShopCart,
  generateRoomShopCartSuggestions,
  saveRoomShopCart,
  type RoomShopCartItem,
  type RoomShopCartSuggestion,
} from "@/lib/roomAnalysis";

const STORAGE_KEY = "ed_room_shop_cart";

type StoredRoomCart = {
  items: RoomShopCartItem[];
  suggestions: RoomShopCartSuggestion[];
};

function readGuestCart(): StoredRoomCart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { items: [], suggestions: [] };
    }

    const parsed = JSON.parse(raw) as Partial<StoredRoomCart>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { items: [], suggestions: [] };
  }
}

function writeGuestCart(cart: StoredRoomCart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

export function useRoomShopCart() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<RoomShopCartItem[]>([]);
  const [suggestions, setSuggestions] = useState<RoomShopCartSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      if (!token) {
        const guestCart = readGuestCart();
        if (isMounted) {
          setItems(guestCart.items);
          setSuggestions(guestCart.suggestions);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await fetchRoomShopCart(token);
        if (!isMounted) {
          return;
        }
        setItems(response.cart.items);
        setSuggestions(response.cart.suggestions);
      } catch {
        if (isMounted) {
          setItems([]);
          setSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCart();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const cartUrls = useMemo(() => new Set(items.map((item) => item.url)), [items]);

  const saveItems = useCallback(
    async (nextItems: RoomShopCartItem[]) => {
      const previousItems = items;
      const previousSuggestions = suggestions;

      setItems(nextItems);
      setSuggestions([]);

      if (!token) {
        writeGuestCart({ items: nextItems, suggestions: [] });
        return true;
      }

      setSaving(true);

      try {
        const response = await saveRoomShopCart({ items: nextItems }, token);
        setItems(response.cart.items);
        setSuggestions(response.cart.suggestions);
        return true;
      } catch (error) {
        setItems(previousItems);
        setSuggestions(previousSuggestions);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [items, suggestions, token]
  );

  const clearCart = useCallback(async () => {
    const previousItems = items;
    const previousSuggestions = suggestions;

    setItems([]);
    setSuggestions([]);

    if (!token) {
      writeGuestCart({ items: [], suggestions: [] });
      return;
    }

    setSaving(true);

    try {
      const response = await clearRoomShopCart(token);
      setItems(response.cart.items);
      setSuggestions(response.cart.suggestions);
    } catch (error) {
      setItems(previousItems);
      setSuggestions(previousSuggestions);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [items, suggestions, token]);

  const generateSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);

    try {
      const response = await generateRoomShopCartSuggestions({ items }, token);
      setItems(response.cart.items);
      setSuggestions(response.suggestions);

      if (!token) {
        writeGuestCart({
          items: response.cart.items,
          suggestions: response.suggestions,
        });
      }

      return response.suggestions;
    } finally {
      setSuggestionsLoading(false);
    }
  }, [items, token]);

  return {
    cartUrls,
    clearCart,
    generateSuggestions,
    isSignedIn: Boolean(user),
    items,
    loading,
    saveItems,
    saving,
    suggestions,
    suggestionsLoading,
  };
}
