import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    Loader2,
    ArrowRight,
    ShoppingBag,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import productShowcase from "@/assets/product-showcase.webp";

const CartPage = () => {
    const { user } = useAuth();
    const { cartItems, cartTotal, cartCount, loading, updateQuantity, removeFromCart } =
        useCart();
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="pt-24 pb-20 container max-w-3xl text-center py-20">
                    <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-body mb-4">Please log in to view your cart</p>
                    <Button asChild>
                        <Link to="/login">Log In</Link>
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">
                            Shopping Cart
                        </h1>
                        <p className="text-muted-foreground font-body text-sm">
                            {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
                        </p>
                    </motion.div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div className="text-center py-20">
                            <ShoppingBag className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="text-muted-foreground font-body text-lg mb-2">
                                Your cart is empty
                            </p>
                            <p className="text-muted-foreground font-body text-sm mb-6">
                                Browse the marketplace and add products to your cart
                            </p>
                            <Button asChild>
                                <Link to="/marketplace">
                                    <ShoppingBag className="w-4 h-4 mr-2" /> Browse Marketplace
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Cart Items */}
                            <Card className="shadow-card">
                                <CardContent className="p-0 divide-y divide-border">
                                    {cartItems.map((item, i) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex gap-4 p-4"
                                        >
                                            <img
                                                src={item.product_image || productShowcase}
                                                alt={item.product_name}
                                                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-body font-semibold text-foreground text-sm truncate">
                                                    {item.product_name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground font-body">
                                                    by {item.seller_name} · {item.category}
                                                </p>
                                                <p className="font-body font-bold text-primary mt-1">
                                                    ₹{item.product_price}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end justify-between">
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1}
                                                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-sm font-body font-semibold text-foreground w-6 text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                item.product_stock > 0
                                                                    ? Math.min(item.quantity + 1, item.product_stock)
                                                                    : item.quantity + 1
                                                            )
                                                        }
                                                        disabled={item.product_stock > 0 && item.quantity >= item.product_stock}
                                                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Order Summary */}
                            <Card className="shadow-card">
                                <CardHeader>
                                    <CardTitle className="font-display text-lg">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between text-sm font-body">
                                        <span className="text-muted-foreground">
                                            Subtotal ({cartCount} items)
                                        </span>
                                        <span className="font-semibold text-foreground">₹{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-body">
                                        <span className="text-muted-foreground">Delivery</span>
                                        <span className="font-semibold text-emerald-600">Free</span>
                                    </div>
                                    <div className="border-t border-border pt-3 flex justify-between">
                                        <span className="font-body font-semibold text-foreground">Total</span>
                                        <span className="font-display font-bold text-xl text-primary">
                                            ₹{cartTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <Button
                                        className="w-full mt-4"
                                        size="lg"
                                        onClick={() => navigate("/checkout")}
                                    >
                                        Proceed to Checkout
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default CartPage;
