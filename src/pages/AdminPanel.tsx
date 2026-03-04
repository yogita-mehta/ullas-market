import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Package, ShoppingCart, Shield,
  CheckCircle, XCircle, Eye, Trash2, Loader2, Search,
  AlertTriangle, FileCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface SellerProfile {
  id: string;
  user_id: string;
  business_name: string;
  fssai_number: string | null;
  fssai_license: string | null;
  fssai_certificate_url: string | null;
  fssai_status: string;
  fssai_verified: boolean | null;
  rejection_reason: string | null;
  kudumbashree_unit: string | null;
  created_at: string;
  seller_name?: string;
  trust_score?: number;
}

interface ProductWithSeller {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  is_active: boolean | null;
  image_url: string | null;
  seller_id: string;
  created_at: string;
  seller_name?: string;
  seller_verified?: boolean;
}

interface OrderWithDetails {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  buyer_id: string;
  buyer_name: string;
  shipping_address: string | null;
  shipping_district: string | null;
  item_count: number;
}

// Track whether new columns exist in the DB
let hasNewColumns: boolean | null = null;

interface RiskFlagItem {
  id: string;
  seller_id: string;
  flag_type: string;
  details: string | null;
  severity: string;
  resolved: boolean;
  created_at: string;
  seller_name?: string;
  business_name?: string;
}

const AdminPanel = () => {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerFilter, setSellerFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlagItem[]>([]);
  const [runningMonitor, setRunningMonitor] = useState(false);

  // Detect whether new columns exist
  const detectNewColumns = async () => {
    if (hasNewColumns !== null) return hasNewColumns;
    const { error } = await supabase
      .from("seller_profiles")
      .select("fssai_status")
      .limit(0);
    hasNewColumns = !error;
    return hasNewColumns;
  };

  const fetchSellers = async () => {
    const columnsExist = await detectNewColumns();

    // Fetch with existing columns first
    const { data: sellerProfiles } = await supabase
      .from("seller_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (sellerProfiles) {
      const userIds = sellerProfiles.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));

      setSellers(
        sellerProfiles.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          business_name: s.business_name,
          fssai_license: s.fssai_license || null,
          fssai_verified: s.fssai_verified ?? false,
          kudumbashree_unit: s.kudumbashree_unit || null,
          created_at: s.created_at,
          // New columns (may or may not exist)
          fssai_number: s.fssai_number || s.fssai_license || null,
          fssai_certificate_url: s.fssai_certificate_url || null,
          fssai_status: s.fssai_status || (s.fssai_verified ? "approved" : "pending"),
          rejection_reason: s.rejection_reason || null,
          seller_name: nameMap.get(s.user_id) || "Unknown",
          trust_score: (s as any).trust_score ?? 100,
        }))
      );
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const sellerIds = [...new Set(data.map((p) => p.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", sellerIds);
      const { data: sellerProfs } = await supabase
        .from("seller_profiles")
        .select("user_id, fssai_verified")
        .in("user_id", sellerIds);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
      const verifiedMap = new Map((sellerProfs || []).map((s) => [s.user_id, s.fssai_verified]));

      setProducts(
        data.map((p) => ({
          ...p,
          seller_name: nameMap.get(p.seller_id) || "Unknown",
          seller_verified: verifiedMap.get(p.seller_id) ?? false,
        }))
      );
    }
  };

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersData) {
      const buyerIds = [...new Set(ordersData.map((o) => o.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", buyerIds);

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("order_id")
        .in("order_id", ordersData.map((o) => o.id));

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
      const itemCountMap = new Map<string, number>();
      (orderItems || []).forEach((oi) => {
        itemCountMap.set(oi.order_id, (itemCountMap.get(oi.order_id) || 0) + 1);
      });

      setOrders(
        ordersData.map((o) => ({
          ...o,
          buyer_name: nameMap.get(o.buyer_id) || "Unknown",
          item_count: itemCountMap.get(o.id) || 0,
        }))
      );
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchSellers(), fetchProducts(), fetchOrders(), fetchRiskFlags()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const fetchRiskFlags = async () => {
    const { data: flags } = await supabase
      .from("risk_flags" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (flags && (flags as any[]).length > 0) {
      const sellerIds = [...new Set((flags as any[]).map((f: any) => f.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", sellerIds);
      const { data: sellerProfs } = await supabase
        .from("seller_profiles")
        .select("user_id, business_name")
        .in("user_id", sellerIds);

      const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name || "Unknown"]));
      const bizMap = new Map((sellerProfs || []).map((s) => [s.user_id, s.business_name]));

      setRiskFlags(
        (flags as any[]).map((f: any) => ({
          ...f,
          seller_name: nameMap.get(f.seller_id) || "Unknown",
          business_name: bizMap.get(f.seller_id) || "Unknown",
        }))
      );
    } else {
      setRiskFlags([]);
    }
  };

  const handleResolveFlag = async (flagId: string) => {
    setActionLoadingId(flagId);
    const { error } = await supabase
      .from("risk_flags" as any)
      .update({ resolved: true } as any)
      .eq("id", flagId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Flag Resolved", description: "Risk flag has been marked as resolved." });
      fetchRiskFlags();
    }
    setActionLoadingId(null);
  };

  const handleRunTrustMonitor = async () => {
    setRunningMonitor(true);
    try {
      const { data, error } = await supabase.functions.invoke("trust-monitor", { body: {} });
      if (error) throw error;
      toast({
        title: "Trust Monitor Complete",
        description: `Created ${data?.new_flags_created || 0} new flags.`,
      });
      await Promise.all([fetchRiskFlags(), fetchSellers()]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRunningMonitor(false);
    }
  };

  const handleApproveSeller = async (seller: SellerProfile) => {
    setActionLoadingId(seller.id);
    const columnsExist = await detectNewColumns();

    const updateData: any = { fssai_verified: true };
    if (columnsExist) {
      updateData.fssai_status = "approved";
      updateData.rejection_reason = null;
    }

    const { error } = await supabase
      .from("seller_profiles")
      .update(updateData)
      .eq("id", seller.id);

    if (error) {
      // Retry with only existing column if new columns fail
      const { error: retryError } = await supabase
        .from("seller_profiles")
        .update({ fssai_verified: true })
        .eq("id", seller.id);

      if (retryError) {
        toast({ title: "Error", description: retryError.message, variant: "destructive" });
      } else {
        toast({ title: "Seller Approved ✓", description: `${seller.business_name} is now FSSAI verified.` });
        fetchSellers();
      }
    } else {
      toast({ title: "Seller Approved ✓", description: `${seller.business_name} is now FSSAI verified.` });
      fetchSellers();
    }
    setActionLoadingId(null);
  };

  const handleRejectSeller = async (seller: SellerProfile) => {
    if (!rejectReason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }

    setActionLoadingId(seller.id);
    const columnsExist = await detectNewColumns();

    const updateData: any = { fssai_verified: false };
    if (columnsExist) {
      updateData.fssai_status = "rejected";
      updateData.rejection_reason = rejectReason.trim();
    }

    const { error } = await supabase
      .from("seller_profiles")
      .update(updateData)
      .eq("id", seller.id);

    if (error) {
      // Retry with only existing column
      const { error: retryError } = await supabase
        .from("seller_profiles")
        .update({ fssai_verified: false })
        .eq("id", seller.id);

      if (retryError) {
        toast({ title: "Error", description: retryError.message, variant: "destructive" });
      } else {
        toast({ title: "Seller Rejected", description: `${seller.business_name} has been rejected.` });
        setRejectingId(null);
        setRejectReason("");
        fetchSellers();
      }
    } else {
      toast({ title: "Seller Rejected", description: `${seller.business_name} has been rejected.` });
      setRejectingId(null);
      setRejectReason("");
      fetchSellers();
    }
    setActionLoadingId(null);
  };

  const handleDeleteProduct = async (product: ProductWithSeller) => {
    setActionLoadingId(product.id);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product Deleted", description: `${product.name} has been removed.` });
      fetchProducts();
    }
    setActionLoadingId(null);
  };

  const filteredSellers = sellers.filter((s) => {
    if (sellerFilter !== "all" && s.fssai_status !== sellerFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.business_name.toLowerCase().includes(q) ||
        s.seller_name?.toLowerCase().includes(q) ||
        s.fssai_number?.toLowerCase().includes(q) ||
        s.fssai_license?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    return true;
  });

  const pendingCount = sellers.filter((s) => s.fssai_status === "pending").length;

  const stats = [
    { label: "Total Sellers", value: String(sellers.length), icon: Users, color: "text-blue-600" },
    { label: "Active Products", value: String(products.filter((p) => p.is_active).length), icon: Package, color: "text-emerald-600" },
    { label: "Total Orders", value: String(orders.length), icon: ShoppingCart, color: "text-violet-600" },
    { label: "Pending Approvals", value: String(pendingCount), icon: AlertTriangle, color: "text-amber-600" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">✓ Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">✗ Rejected</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">⏳ Pending</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs capitalize">Delivered</Badge>;
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs capitalize">Shipped</Badge>;
      case "accepted":
        return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-xs capitalize">Accepted</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs capitalize">Cancelled</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs capitalize">Pending</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">💰 Paid</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Payment Failed</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">Payment Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Admin Panel
            </h1>
            <p className="text-muted-foreground font-body">Platform management and compliance control</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="sellers" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sellers" className="font-body text-sm">
                <Shield className="w-4 h-4 mr-1.5" />
                Sellers
                {pendingCount > 0 && (
                  <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="products" className="font-body text-sm">
                <Package className="w-4 h-4 mr-1.5" />
                Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="font-body text-sm">
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="trust" className="font-body text-sm">
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Trust
                {riskFlags.filter(f => !f.resolved).length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {riskFlags.filter(f => !f.resolved).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ====== SELLERS TAB ====== */}
            <TabsContent value="sellers">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Seller Verification
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {["all", "pending", "approved", "rejected"].map((f) => (
                        <Button
                          key={f}
                          variant={sellerFilter === f ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSellerFilter(f)}
                          className="capitalize text-xs"
                        >
                          {f === "all" ? "All" : f}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, business, or FSSAI number..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredSellers.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No sellers found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSellers.map((seller) => (
                        <div key={seller.id} className="p-4 bg-muted/50 rounded-xl">
                          <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-body font-semibold text-sm text-foreground truncate">
                                  {seller.business_name}
                                </p>
                                {getStatusBadge(seller.fssai_status)}
                              </div>
                              <p className="text-xs text-muted-foreground font-body mb-1">
                                {seller.seller_name} · Joined {new Date(seller.created_at).toLocaleDateString("en-IN")}
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-body">
                                {(seller.fssai_number || seller.fssai_license) && (
                                  <span><strong>FSSAI:</strong> {seller.fssai_number || seller.fssai_license}</span>
                                )}
                                {seller.kudumbashree_unit && (
                                  <span><strong>Kudumbashree:</strong> {seller.kudumbashree_unit}</span>
                                )}
                              </div>
                              {seller.fssai_status === "rejected" && seller.rejection_reason && (
                                <p className="text-xs text-red-600 font-body mt-1">
                                  <strong>Rejection:</strong> {seller.rejection_reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-start gap-2 flex-shrink-0">
                              {seller.fssai_certificate_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCertificateUrl(seller.fssai_certificate_url)}
                                >
                                  <Eye className="w-4 h-4 mr-1" /> Certificate
                                </Button>
                              )}
                              {seller.fssai_status !== "approved" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleApproveSeller(seller)}
                                  disabled={actionLoadingId === seller.id}
                                >
                                  {actionLoadingId === seller.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle className="w-4 h-4 mr-1" /> Approve</>
                                  )}
                                </Button>
                              )}
                              {seller.fssai_status !== "rejected" && (
                                <>
                                  {rejectingId === seller.id ? (
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        placeholder="Rejection reason..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        className="w-40 h-8 text-xs"
                                      />
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleRejectSeller(seller)}
                                        disabled={actionLoadingId === seller.id}
                                      >
                                        {actionLoadingId === seller.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          "Confirm"
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 border-red-200 hover:bg-red-50"
                                      onClick={() => setRejectingId(seller.id)}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" /> Reject
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ====== PRODUCTS TAB ====== */}
            <TabsContent value="products">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Product Monitoring
                    <Badge variant="secondary" className="ml-2 text-xs">{products.length} total</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <div className="text-center py-10">
                      <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No products listed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {product.image_url && (
                              <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-body font-semibold text-sm text-foreground truncate">{product.name}</p>
                                {product.seller_verified ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs flex-shrink-0">
                                    <FileCheck className="w-3 h-3 mr-0.5" /> Verified
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs flex-shrink-0">
                                    Unverified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-body">
                                {product.seller_name} · {product.category} · ₹{product.price} · Stock: {product.stock}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                              {product.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  disabled={actionLoadingId === product.id}
                                >
                                  {actionLoadingId === product.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteProduct(product)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ====== ORDERS TAB ====== */}
            <TabsContent value="orders">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Order Monitoring
                      <Badge variant="secondary" className="ml-2 text-xs">{orders.length} total</Badge>
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      {["all", "pending", "accepted", "shipped", "delivered", "cancelled"].map((f) => (
                        <Button
                          key={f}
                          variant={orderFilter === f ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOrderFilter(f)}
                          className="capitalize text-xs"
                        >
                          {f === "all" ? "All" : f}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-10">
                      <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No orders found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-body font-semibold text-sm text-foreground">
                                {order.buyer_name}
                              </p>
                              {getOrderStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.payment_status)}
                            </div>
                            <p className="text-xs text-muted-foreground font-body">
                              {new Date(order.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" · "}
                              {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                              {order.shipping_district && ` · ${order.shipping_district}`}
                            </p>
                          </div>
                          <p className="font-body font-bold text-foreground text-lg">₹{order.total}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ====== TRUST & RISK TAB ====== */}
            <TabsContent value="trust">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Trust & Risk Monitoring
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {riskFlags.filter(f => !f.resolved).length} active flags
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRunTrustMonitor}
                      disabled={runningMonitor}
                    >
                      {runningMonitor ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Shield className="w-4 h-4 mr-1" />
                      )}
                      Run Trust Monitor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {riskFlags.length === 0 ? (
                    <div className="text-center py-10">
                      <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-body text-sm">No risk flags found. Run the trust monitor to scan for issues.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {riskFlags.map((flag) => (
                        <div
                          key={flag.id}
                          className={`p-4 rounded-xl ${flag.resolved ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-body font-semibold text-sm text-foreground">
                                  {flag.business_name}
                                </p>
                                <Badge
                                  className={`text-xs ${flag.severity === 'high'
                                      ? 'bg-red-100 text-red-800 hover:bg-red-100'
                                      : flag.severity === 'medium'
                                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                    }`}
                                >
                                  {flag.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {flag.flag_type.replace(/_/g, ' ')}
                                </Badge>
                                {flag.resolved && (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">
                                    ✓ Resolved
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-body">
                                {flag.seller_name} · {new Date(flag.created_at).toLocaleDateString("en-IN")}
                              </p>
                              {flag.details && (
                                <p className="text-xs text-foreground/70 font-body mt-1">
                                  {flag.details}
                                </p>
                              )}
                            </div>
                            <div className="flex items-start gap-2 flex-shrink-0">
                              {!flag.resolved && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => handleResolveFlag(flag.id)}
                                  disabled={actionLoadingId === flag.id}
                                >
                                  {actionLoadingId === flag.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><CheckCircle className="w-4 h-4 mr-1" /> Resolve</>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Certificate Viewer Modal */}
      <Dialog open={!!certificateUrl} onOpenChange={() => setCertificateUrl(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">FSSAI Certificate</DialogTitle>
          </DialogHeader>
          {certificateUrl && (
            <div className="rounded-xl overflow-hidden border">
              <img
                src={certificateUrl}
                alt="FSSAI Certificate"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminPanel;
