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
  AlertTriangle, FileCheck, Truck, MapPin, CreditCard
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface DeliveryBatchWithCount {
  id: string;
  village: string;
  district: string | null;
  status: string;
  delivery_partner: string | null;
  delivery_partner_name: string | null;
  created_at: string;
  order_count: number;
}

interface DeliveryPartnerInfo {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  assigned_village: string | null;
  status: string;
}

// Track whether new columns exist in the DB
let hasNewColumns: boolean | null = null;

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
  const [deliveryBatches, setDeliveryBatches] = useState<DeliveryBatchWithCount[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerInfo[]>([]);
  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");
  const [newPartnerVehicle, setNewPartnerVehicle] = useState("");
  const [newPartnerVillage, setNewPartnerVillage] = useState("");
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [registeringPartner, setRegisteringPartner] = useState(false);

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

  const fetchDeliveryBatches = async () => {
    const { data: batchesData } = await supabase
      .from("delivery_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (batchesData) {
      // Get order counts per batch
      const batchIds = batchesData.map((b) => b.id);
      const { data: ordersInBatches } = await supabase
        .from("orders")
        .select("batch_id")
        .in("batch_id", batchIds);

      const countMap = new Map<string, number>();
      (ordersInBatches || []).forEach((o) => {
        if (o.batch_id) countMap.set(o.batch_id, (countMap.get(o.batch_id) || 0) + 1);
      });

      // Get partner names
      const partnerIds = batchesData.map((b) => b.delivery_partner).filter(Boolean) as string[];
      let partnerNameMap = new Map<string, string>();
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from("delivery_partners")
          .select("user_id, name")
          .in("user_id", partnerIds);
        (partners || []).forEach((p) => partnerNameMap.set(p.user_id, p.name));
      }

      setDeliveryBatches(
        batchesData.map((b) => ({
          ...b,
          delivery_partner_name: b.delivery_partner ? partnerNameMap.get(b.delivery_partner) || null : null,
          order_count: countMap.get(b.id) || 0,
        }))
      );
    }
  };

  const fetchDeliveryPartners = async () => {
    const { data } = await supabase
      .from("delivery_partners")
      .select("*")
      .order("name");
    setDeliveryPartners(data || []);
  };

  const assignPartnerToBatch = async (batchId: string, partnerUserId: string) => {
    setAssigningBatchId(batchId);
    const { error } = await supabase
      .from("delivery_batches")
      .update({
        delivery_partner: partnerUserId,
        status: "assigned",
      })
      .eq("id", batchId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Notify the delivery partner
      await supabase.from("notifications").insert({
        user_id: partnerUserId,
        title: "New Batch Assigned! 📦",
        message: "A new delivery batch has been assigned to you. Check your delivery dashboard.",
        type: "delivery",
      });

      toast({ title: "Partner Assigned ✓", description: "Delivery partner has been assigned to the batch." });
      fetchDeliveryBatches();
    }
    setAssigningBatchId(null);
    setSelectedPartnerId("");
  };

  const registerDeliveryPartner = async () => {
    if (!newPartnerName.trim() || !newPartnerEmail.trim()) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }

    setRegisteringPartner(true);
    try {
      // Look up user by email via admin RPC function
      const { data: userId, error: lookupError } = await supabase
        .rpc("get_user_id_by_email", { lookup_email: newPartnerEmail.trim() });

      if (lookupError || !userId) {
        toast({ title: "User not found", description: "No user found with this email. They must sign up first.", variant: "destructive" });
        setRegisteringPartner(false);
        return;
      }

      // Assign delivery_partner role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "delivery_partner" });
      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      // Update profiles table role
      await supabase
        .from("profiles")
        .update({ role: "delivery_partner" })
        .eq("user_id", userId);

      // Create delivery partner profile
      const { error: dpError } = await supabase
        .from("delivery_partners")
        .insert({
          user_id: userId,
          name: newPartnerName.trim(),
          phone: newPartnerPhone.trim(),
          vehicle_type: newPartnerVehicle || null,
          assigned_village: newPartnerVillage || null,
          status: "available",
        });

      if (dpError && !dpError.message.includes("duplicate")) throw dpError;

      toast({ title: "Delivery partner registered! ✓" });
      setNewPartnerName("");
      setNewPartnerPhone("");
      setNewPartnerVehicle("");
      setNewPartnerVillage("");
      setNewPartnerEmail("");
      fetchDeliveryPartners();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRegisteringPartner(false);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchSellers(), fetchProducts(), fetchOrders(), fetchDeliveryBatches(), fetchDeliveryPartners()]);
      setLoading(false);
    };
    fetchAll();
  }, []);

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

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });
  const todayPayments = todayOrders.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: "Total Sellers", value: String(sellers.length), icon: Users, color: "text-blue-600" },
    { label: "Active Products", value: String(products.filter((p) => p.is_active).length), icon: Package, color: "text-emerald-600" },
    { label: "Total Orders", value: String(orders.length), icon: ShoppingCart, color: "text-violet-600" },
    { label: "Pending Approvals", value: String(pendingCount), icon: AlertTriangle, color: "text-amber-600" },
    { label: "Active Batches", value: String(deliveryBatches.filter((b) => b.status !== "delivered").length), icon: Truck, color: "text-cyan-600" },
    { label: "Today's Payments", value: `₹${todayPayments.toLocaleString()}`, icon: CreditCard, color: "text-pink-600" },
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
              <TabsTrigger value="logistics" className="font-body text-sm">
                <Truck className="w-4 h-4 mr-1.5" />
                Logistics
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
            {/* ====== LOGISTICS TAB ====== */}
            <TabsContent value="logistics">
              <div className="space-y-6">
                {/* Delivery Batches */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Delivery Batches
                      <Badge variant="secondary" className="ml-2 text-xs">{deliveryBatches.length} total</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deliveryBatches.length === 0 ? (
                      <div className="text-center py-10">
                        <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-body text-sm">No delivery batches yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deliveryBatches.map((batch) => (
                          <div key={batch.id} className="p-4 bg-muted/50 rounded-xl">
                            <div className="flex flex-col sm:flex-row justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <MapPin className="w-4 h-4 text-primary" />
                                  <p className="font-body font-semibold text-sm text-foreground">
                                    {batch.village}
                                    {batch.district && ` — ${batch.district}`}
                                  </p>
                                  <Badge className={`text-xs ${batch.status === "delivered" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" :
                                    batch.status === "out_for_delivery" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" :
                                      batch.status === "picked_up" ? "bg-violet-100 text-violet-800 hover:bg-violet-100" :
                                        batch.status === "assigned" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" :
                                          "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                    }`}>
                                    {batch.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-body">
                                  {batch.order_count} order{batch.order_count !== 1 ? "s" : ""} ·{" "}
                                  {new Date(batch.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                  {batch.delivery_partner_name && (
                                    <> · Partner: <strong>{batch.delivery_partner_name}</strong></>
                                  )}
                                </p>
                              </div>
                              {/* Assign Partner */}
                              {!batch.delivery_partner && batch.status === "created" && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Select
                                    value={selectedPartnerId}
                                    onValueChange={setSelectedPartnerId}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-xs">
                                      <SelectValue placeholder="Select partner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {deliveryPartners
                                        .filter((p) => p.status === "available")
                                        .map((p) => (
                                          <SelectItem key={p.user_id} value={p.user_id} className="text-xs">
                                            {p.name} {p.vehicle_type && `(${p.vehicle_type})`}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={!selectedPartnerId || assigningBatchId === batch.id}
                                    onClick={() => assignPartnerToBatch(batch.id, selectedPartnerId)}
                                  >
                                    {assigningBatchId === batch.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      "Assign"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Partners */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Delivery Partners
                      <Badge variant="secondary" className="ml-2 text-xs">{deliveryPartners.length} total</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deliveryPartners.length === 0 ? (
                      <div className="text-center py-10">
                        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-body text-sm">No delivery partners registered</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {deliveryPartners.map((partner) => (
                          <div key={partner.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${partner.status === "available" ? "bg-emerald-500" :
                                partner.status === "busy" ? "bg-amber-500" : "bg-gray-400"
                                }`} />
                              <div>
                                <p className="font-body font-semibold text-sm text-foreground">{partner.name}</p>
                                <p className="text-xs text-muted-foreground font-body">
                                  {partner.phone && `${partner.phone} · `}
                                  {partner.vehicle_type && `${partner.vehicle_type} · `}
                                  {partner.assigned_village && `Village: ${partner.assigned_village}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant={partner.status === "available" ? "default" : "secondary"} className="text-xs capitalize">
                              {partner.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Register New Delivery Partner */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-primary" />
                      Register Delivery Partner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-body font-semibold text-foreground mb-1 block">Full Name *</label>
                        <Input
                          placeholder="Rajan Kumar"
                          value={newPartnerName}
                          onChange={(e) => setNewPartnerName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-body font-semibold text-foreground mb-1 block">User Email (signup email) *</label>
                        <Input
                          placeholder="user@example.com"
                          value={newPartnerEmail}
                          onChange={(e) => setNewPartnerEmail(e.target.value)}
                          className="h-9 text-sm"
                          type="email"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-body font-semibold text-foreground mb-1 block">Phone</label>
                        <Input
                          placeholder="9876543210"
                          value={newPartnerPhone}
                          onChange={(e) => setNewPartnerPhone(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-body font-semibold text-foreground mb-1 block">Vehicle Type</label>
                        <Select value={newPartnerVehicle} onValueChange={setNewPartnerVehicle}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bicycle">Bicycle</SelectItem>
                            <SelectItem value="motorcycle">Motorcycle</SelectItem>
                            <SelectItem value="scooter">Scooter</SelectItem>
                            <SelectItem value="auto">Auto Rickshaw</SelectItem>
                            <SelectItem value="van">Van</SelectItem>
                            <SelectItem value="on_foot">On Foot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-body font-semibold text-foreground mb-1 block">Assigned Village</label>
                        <Input
                          placeholder="e.g. Thrissur"
                          value={newPartnerVillage}
                          onChange={(e) => setNewPartnerVillage(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          className="w-full h-9 text-sm"
                          onClick={registerDeliveryPartner}
                          disabled={registeringPartner}
                        >
                          {registeringPartner ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Register Partner
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Today's Summary */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Today's Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <p className="text-2xl font-display font-bold text-foreground">{todayOrders.length}</p>
                        <p className="text-xs text-muted-foreground font-body">Orders Today</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <p className="text-2xl font-display font-bold text-emerald-600">₹{todayPayments.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground font-body">Payments Today</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <p className="text-2xl font-display font-bold text-foreground">
                          {deliveryBatches.filter((b) => b.status !== "delivered").length}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">Pending Deliveries</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-xl">
                        <p className="text-2xl font-display font-bold text-foreground">
                          {deliveryPartners.filter((p) => p.status === "available").length}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">Available Partners</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
