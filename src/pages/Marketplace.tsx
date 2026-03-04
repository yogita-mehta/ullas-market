import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Star, ShoppingCart, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import productShowcase from "@/assets/product-showcase.webp";

type Product = Tables<"products">;

const categories = ["All", "Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"];

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [verifiedSellers, setVerifiedSellers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      // Fetch verified seller IDs first
      const { data: verifiedProfiles } = await supabase
        .from("seller_profiles")
        .select("user_id")
        .eq("fssai_verified", true);

      const verifiedIds = new Set((verifiedProfiles || []).map((p) => p.user_id));
      setVerifiedSellers(verifiedIds);

      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data) {
        // Filter to only show products from verified sellers
        const verifiedProducts = data.filter((p) => verifiedIds.has(p.seller_id));
        setProducts(verifiedProducts);

        // Fetch seller profile names
        const sellerIds = [...new Set(verifiedProducts.map((p) => p.seller_id))];
        if (sellerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", sellerIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p) => { map[p.user_id] = p.full_name || "Local Seller"; });
          setSellerNames(map);
        }
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchCategory = activeCategory === "All" || p.category === activeCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.local_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const handleBuyNow = async (product: Product) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to place an order.", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (user.id === product.seller_id) {
      toast({ title: "Can't buy own product", description: "You can't purchase your own product.", variant: "destructive" });
      return;
    }

    setBuyingId(product.id);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          total: product.price,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      const { error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          product_id: product.id,
          quantity: 1,
          price: product.price,
        });

      if (itemError) throw itemError;

      toast({ title: "Order placed! 🎉", description: `${product.name} ordered for ₹${product.price}. Go to your dashboard to pay.` });
    } catch (err: any) {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-2">
              Marketplace
            </h1>
            <p className="text-muted-foreground font-body">
              Authentic homemade products from FSSAI verified sellers
            </p>
          </motion.div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products... try 'achappam' or 'banana chips'"
                className="pl-10 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="default">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product, i) => (
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
                      <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm text-foreground font-body text-xs">
                        {product.category}
                      </Badge>
                    </div>
                    {/* FSSAI Verified Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-body text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        FSSAI Verified
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body mb-3">
                      <span className="font-medium text-foreground">
                        {sellerNames[product.seller_id] || "Local Seller"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-body font-bold text-lg text-primary">₹{product.price}</p>
                      {product.rating && Number(product.rating) > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-primary fill-primary" />
                          <span className="text-sm font-body font-medium text-foreground">
                            {Number(product.rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handleBuyNow(product)}
                      disabled={buyingId === product.id || product.stock <= 0}
                    >
                      {buyingId === product.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-1" />
                      )}
                      {product.stock <= 0 ? "Out of Stock" : "Buy Now"}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-body text-lg">No products found</p>
              <p className="text-muted-foreground font-body text-sm mt-1">Try a different search or category</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Marketplace;
