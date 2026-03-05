import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  SlidersHorizontal,
  Star,
  ShoppingCart,
  Loader2,
  ShieldCheck,
  MapPin,
  Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { useCart } from "@/contexts/CartContext";
import { haversineDistance } from "@/lib/geo";
import productShowcase from "@/assets/product-showcase.webp";

type Product = Tables<"products">;

interface SellerWithDistance {
  user_id: string;
  full_name: string | null;
  village: string | null;
  district: string | null;
  business_name?: string;
  fssai_verified: boolean;
  distance: number | null; // km
  avgRating: number | null;
  productCount: number;
}

interface ProductWithMeta extends Product {
  seller_name: string;
  seller_village: string | null;
  distance: number | null;
  fssai_verified: boolean;
}

const categories = ["All", "Snacks", "Pickles", "Sweets", "Spices", "Ready-to-Eat"];

const Marketplace = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithMeta[]>([]);
  const [nearbySellers, setNearbySellers] = useState<SellerWithDistance[]>([]);
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      setLoading(true);

      // 1. Get buyer's location (if logged in)
      let buyerLat: number | null = null;
      let buyerLon: number | null = null;

      if (user) {
        const { data: buyerProfile } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("user_id", user.id)
          .maybeSingle();

        buyerLat = buyerProfile?.latitude ?? null;
        buyerLon = buyerProfile?.longitude ?? null;
      }

      // 2. Fetch verified seller IDs
      const { data: verifiedProfiles } = await supabase
        .from("seller_profiles")
        .select("user_id, business_name, fssai_verified")
        .eq("fssai_verified", true);

      const verifiedMap = new Map(
        (verifiedProfiles || []).map((p) => [
          p.user_id,
          { business_name: p.business_name, fssai_verified: p.fssai_verified ?? false },
        ])
      );
      const verifiedIds = [...verifiedMap.keys()];

      // 3. Fetch active products from verified sellers
      const { data: rawProducts } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const verifiedProducts = (rawProducts || []).filter((p) =>
        verifiedIds.includes(p.seller_id)
      );

      // 4. Fetch seller profiles (name + location)
      const sellerIds = [...new Set(verifiedProducts.map((p) => p.seller_id))];
      let sellerProfileMap = new Map<
        string,
        { full_name: string | null; village: string | null; district: string | null; latitude: number | null; longitude: number | null }
      >();

      if (sellerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, village, district, latitude, longitude")
          .in("user_id", sellerIds);

        (profiles || []).forEach((p) => {
          sellerProfileMap.set(p.user_id, {
            full_name: p.full_name,
            village: p.village,
            district: p.district,
            latitude: p.latitude,
            longitude: p.longitude,
          });
        });
      }

      // 5. Fetch reviews for average ratings per seller
      const { data: reviews } = await supabase
        .from("reviews")
        .select("product_id, rating");

      const productRatingMap = new Map<string, number[]>();
      (reviews || []).forEach((r) => {
        if (!productRatingMap.has(r.product_id)) {
          productRatingMap.set(r.product_id, []);
        }
        productRatingMap.get(r.product_id)!.push(r.rating);
      });

      // 6. Build enriched products
      const enrichedProducts: ProductWithMeta[] = verifiedProducts.map((p) => {
        const sp = sellerProfileMap.get(p.seller_id);
        const vm = verifiedMap.get(p.seller_id);
        let dist: number | null = null;

        if (buyerLat && buyerLon && sp?.latitude && sp?.longitude) {
          dist = haversineDistance(buyerLat, buyerLon, sp.latitude, sp.longitude);
        }

        // Use review-based average rating if available, else fallback to product.rating
        const ratings = productRatingMap.get(p.id);
        const avgRating = ratings && ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : p.rating;

        return {
          ...p,
          rating: avgRating,
          seller_name: vm?.business_name || sp?.full_name || "Local Seller",
          seller_village: sp?.village || sp?.district || null,
          distance: dist,
          fssai_verified: vm?.fssai_verified ?? false,
        };
      });

      // Sort by distance if available
      enrichedProducts.sort((a, b) => {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        return 0;
      });

      setProducts(enrichedProducts);

      // 7. Build nearby sellers list
      const sellerAggMap = new Map<string, { ratings: number[]; productCount: number }>();
      verifiedProducts.forEach((p) => {
        if (!sellerAggMap.has(p.seller_id)) {
          sellerAggMap.set(p.seller_id, { ratings: [], productCount: 0 });
        }
        const agg = sellerAggMap.get(p.seller_id)!;
        agg.productCount++;
        const pr = productRatingMap.get(p.id);
        if (pr) agg.ratings.push(...pr);
      });

      const sellers: SellerWithDistance[] = sellerIds.map((sid) => {
        const sp = sellerProfileMap.get(sid);
        const vm = verifiedMap.get(sid);
        const agg = sellerAggMap.get(sid);
        let dist: number | null = null;

        if (buyerLat && buyerLon && sp?.latitude && sp?.longitude) {
          dist = haversineDistance(buyerLat, buyerLon, sp.latitude, sp.longitude);
        }

        return {
          user_id: sid,
          full_name: sp?.full_name || null,
          village: sp?.village || sp?.district || null,
          district: sp?.district || null,
          business_name: vm?.business_name,
          fssai_verified: vm?.fssai_verified ?? false,
          distance: dist,
          avgRating:
            agg && agg.ratings.length > 0
              ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length
              : null,
          productCount: agg?.productCount || 0,
        };
      });

      // Filter to 30km and sort by distance
      const nearby = sellers
        .filter((s) => s.distance !== null && s.distance <= 30)
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

      setNearbySellers(nearby);
      setLoading(false);
    };

    fetchMarketplaceData();
  }, [user]);

  const filtered = products.filter((p) => {
    const matchCategory = activeCategory === "All" || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.local_name?.toLowerCase().includes(q)) ||
      (p.description?.toLowerCase().includes(q)) ||
      p.seller_name.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const handleAddToCart = async (product: ProductWithMeta) => {
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

  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
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
                placeholder="Search products, sellers... try 'achappam' or 'banana chips'"
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

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Nearby Sellers Section */}
              {nearbySellers.length > 0 && !searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-10"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Nearby Sellers
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbySellers.map((seller, i) => (
                      <motion.div
                        key={seller.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Link to={`/store/${seller.user_id}`}>
                          <Card className="shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer group hover:-translate-y-1">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Store className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-body font-semibold text-foreground text-sm truncate">
                                    {seller.business_name || seller.full_name || "Local Seller"}
                                  </p>
                                  {seller.fssai_verified && (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                  )}
                                </div>
                                {seller.village && (
                                  <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {seller.village}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  {seller.avgRating !== null && (
                                    <span className="text-xs font-body text-foreground flex items-center gap-0.5">
                                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                      {seller.avgRating.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground font-body">
                                    {seller.productCount} products
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <Badge variant="outline" className="text-xs font-body border-primary/30 text-primary">
                                  {formatDistance(seller.distance)}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Product Grid */}
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-display font-bold text-foreground">
                  {searchQuery ? `Results for "${searchQuery}"` : "All Products"}
                </h2>
                <span className="text-sm text-muted-foreground font-body ml-1">
                  ({filtered.length})
                </span>
              </div>

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
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <Badge
                          variant="secondary"
                          className="bg-card/90 backdrop-blur-sm text-foreground font-body text-xs"
                        >
                          {product.category}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                        {product.fssai_verified && (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-body text-xs flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            FSSAI
                          </Badge>
                        )}
                        {product.distance !== null && (
                          <Badge variant="outline" className="bg-card/90 backdrop-blur-sm text-xs font-body border-primary/30 text-primary flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {formatDistance(product.distance)}
                          </Badge>
                        )}
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
                      <Link
                        to={`/store/${product.seller_id}`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground font-body mb-3 hover:text-primary transition-colors"
                      >
                        <Store className="w-3 h-3" />
                        <span className="font-medium text-foreground group-hover:text-primary">
                          {product.seller_name}
                        </span>
                        {product.seller_village && (
                          <span className="text-muted-foreground">
                            · {product.seller_village}
                          </span>
                        )}
                      </Link>
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

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground font-body text-lg">
                    No products found
                  </p>
                  <p className="text-muted-foreground font-body text-sm mt-1">
                    Try a different search or category
                  </p>
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

export default Marketplace;
