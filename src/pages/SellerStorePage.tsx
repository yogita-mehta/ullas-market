import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    MapPin,
    Star,
    ShieldCheck,
    ShoppingCart,
    Loader2,
    ArrowLeft,
    Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { useCart } from "@/contexts/CartContext";
import productShowcase from "@/assets/product-showcase.webp";

type Product = Tables<"products">;

interface SellerInfo {
    user_id: string;
    full_name: string | null;
    village: string | null;
    district: string | null;
    state: string | null;
    business_name?: string;
    fssai_verified?: boolean;
}

const SellerStorePage = () => {
    const { sellerId } = useParams<{ sellerId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [seller, setSeller] = useState<SellerInfo | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const [avgRating, setAvgRating] = useState<number | null>(null);
    const [reviewCount, setReviewCount] = useState(0);
    const { addToCart } = useCart();

    useEffect(() => {
        if (!sellerId) return;

        const fetchSellerData = async () => {
            setLoading(true);

            // Fetch seller profile info
            const { data: profile } = await supabase
                .from("profiles")
                .select("user_id, full_name, village, district, state")
                .eq("user_id", sellerId)
                .maybeSingle();

            // Fetch seller business profile
            const { data: sellerProfile } = await supabase
                .from("seller_profiles")
                .select("business_name, fssai_verified")
                .eq("user_id", sellerId)
                .maybeSingle();

            if (profile) {
                setSeller({
                    ...profile,
                    business_name: sellerProfile?.business_name,
                    fssai_verified: sellerProfile?.fssai_verified ?? false,
                });
            }

            // Fetch seller's products
            const { data: prods } = await supabase
                .from("products")
                .select("*")
                .eq("seller_id", sellerId)
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            setProducts(prods || []);

            // Calculate average rating from reviews
            if (prods && prods.length > 0) {
                const productIds = prods.map((p) => p.id);
                const { data: reviews } = await supabase
                    .from("reviews")
                    .select("rating")
                    .in("product_id", productIds);

                if (reviews && reviews.length > 0) {
                    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
                    setAvgRating(total / reviews.length);
                    setReviewCount(reviews.length);
                }
            }

            setLoading(false);
        };

        fetchSellerData();
    }, [sellerId]);

    const handleAddToCart = async (product: Product) => {
        if (!user) {
            toast({
                title: "Please log in",
                description: "You need to be logged in to add items to cart.",
                variant: "destructive",
            });
            navigate("/login");
            return;
        }

        if (user.id === product.seller_id) {
            toast({
                title: "Can't buy own product",
                description: "You can't purchase your own product.",
                variant: "destructive",
            });
            return;
        }

        setBuyingId(product.id);
        try {
            await addToCart(product.id);
            toast({
                title: "Added to cart! 🛒",
                description: `${product.name} has been added to your cart.`,
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setBuyingId(null);
        }
    };

    const sellerDisplayName =
        seller?.business_name || seller?.full_name || "Seller Store";
    const sellerLocation = [seller?.village, seller?.district, seller?.state]
        .filter(Boolean)
        .join(", ");

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-5xl">
                    {/* Back button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mb-6 text-muted-foreground"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !seller ? (
                        <div className="text-center py-20">
                            <Store className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground font-body text-lg">
                                Seller not found
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Seller Header */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8"
                            >
                                <Card className="shadow-card overflow-hidden">
                                    <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-6 sm:p-8">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                                                <Store className="w-8 h-8 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                                        {sellerDisplayName}
                                                    </h1>
                                                    {seller.fssai_verified && (
                                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs flex items-center gap-1">
                                                            <ShieldCheck className="w-3 h-3" />
                                                            FSSAI Verified
                                                        </Badge>
                                                    )}
                                                </div>
                                                {sellerLocation && (
                                                    <p className="text-sm text-muted-foreground font-body flex items-center gap-1 mb-2">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {sellerLocation}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-4">
                                                    {avgRating !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            <span className="text-sm font-body font-semibold text-foreground">
                                                                {avgRating.toFixed(1)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground font-body">
                                                                ({reviewCount} reviews)
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-muted-foreground font-body">
                                                        {products.length} products
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Products Grid */}
                            <h2 className="text-xl font-display font-bold text-foreground mb-4">
                                Products
                            </h2>

                            {products.length === 0 ? (
                                <div className="text-center py-16">
                                    <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground font-body">
                                        No products available yet
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {products.map((product, i) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            whileHover={{ y: -4 }}
                                            className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 group"
                                        >
                                            <div className="relative h-48 overflow-hidden">
                                                <img
                                                    src={product.image_url || productShowcase}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute top-3 left-3">
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-card/90 backdrop-blur-sm text-foreground font-body text-xs"
                                                    >
                                                        {product.category}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-display font-semibold text-foreground text-base mb-0.5">
                                                    {product.name}
                                                </h3>
                                                {product.local_name && (
                                                    <p className="text-xs text-muted-foreground font-body italic mb-2">
                                                        {product.local_name}
                                                    </p>
                                                )}
                                                {product.description && (
                                                    <p className="text-xs text-muted-foreground font-body mb-3 line-clamp-2">
                                                        {product.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="font-body font-bold text-lg text-primary">
                                                        ₹{product.price}
                                                    </p>
                                                    {Number(product.rating) > 0 && (
                                                        <div className="flex items-center gap-1">
                                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            <span className="text-sm font-body font-medium text-foreground">
                                                                {Number(product.rating).toFixed(1)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => handleAddToCart(product)}
                                                        disabled={buyingId === product.id || product.stock <= 0}
                                                    >
                                                        {buyingId === product.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                        ) : (
                                                            <ShoppingCart className="w-4 h-4 mr-1" />
                                                        )}
                                                        {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default SellerStorePage;
