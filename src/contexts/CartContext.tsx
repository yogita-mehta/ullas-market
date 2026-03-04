import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CartItem {
    id: string;
    product_id: string;
    quantity: number;
    product_name: string;
    product_price: number;
    product_image: string | null;
    product_stock: number;
    seller_id: string;
    seller_name: string;
    category: string;
}

interface CartContextType {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    loading: boolean;
    addToCart: (productId: string, quantity?: number) => Promise<void>;
    removeFromCart: (cartItemId: string) => Promise<void>;
    updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
    cartItems: [],
    cartCount: 0,
    cartTotal: 0,
    loading: false,
    addToCart: async () => { },
    removeFromCart: async () => { },
    updateQuantity: async () => { },
    clearCart: async () => { },
    refreshCart: async () => { },
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCart = useCallback(async () => {
        if (!user) {
            setCartItems([]);
            return;
        }

        setLoading(true);

        // Fetch cart items with product details
        const { data: rawItems } = await supabase
            .from("cart_items")
            .select("id, product_id, quantity, products(name, price, image_url, stock, seller_id, category)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (!rawItems || rawItems.length === 0) {
            setCartItems([]);
            setLoading(false);
            return;
        }

        // Fetch seller names
        const sellerIds = [
            ...new Set(rawItems.map((i) => (i.products as any)?.seller_id).filter(Boolean)),
        ];
        const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", sellerIds);

        const profileMap = new Map(
            (profiles || []).map((p) => [p.user_id, p.full_name || "Seller"])
        );

        const items: CartItem[] = rawItems
            .filter((i) => i.products)
            .map((i) => {
                const p = i.products as any;
                return {
                    id: i.id,
                    product_id: i.product_id,
                    quantity: i.quantity,
                    product_name: p.name,
                    product_price: p.price,
                    product_image: p.image_url,
                    product_stock: p.stock,
                    seller_id: p.seller_id,
                    seller_name: profileMap.get(p.seller_id) || "Seller",
                    category: p.category,
                };
            });

        setCartItems(items);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchCart();
    }, [fetchCart]);

    const addToCart = async (productId: string, quantity = 1) => {
        if (!user) return;

        // Check if already in cart
        const existing = cartItems.find((i) => i.product_id === productId);
        if (existing) {
            await updateQuantity(existing.id, existing.quantity + quantity);
            return;
        }

        await supabase.from("cart_items").insert({
            user_id: user.id,
            product_id: productId,
            quantity,
        });

        await fetchCart();
    };

    const removeFromCart = async (cartItemId: string) => {
        await supabase.from("cart_items").delete().eq("id", cartItemId);
        await fetchCart();
    };

    const updateQuantity = async (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(cartItemId);
            return;
        }
        await supabase
            .from("cart_items")
            .update({ quantity })
            .eq("id", cartItemId);
        await fetchCart();
    };

    const clearCart = async () => {
        if (!user) return;
        await supabase.from("cart_items").delete().eq("user_id", user.id);
        setCartItems([]);
    };

    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
    const cartTotal = cartItems.reduce(
        (sum, i) => sum + i.product_price * i.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                cartCount,
                cartTotal,
                loading,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                refreshCart: fetchCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};
