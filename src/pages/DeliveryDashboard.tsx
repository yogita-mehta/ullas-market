import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Truck,
    Package,
    MapPin,
    Phone,
    User,
    CheckCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Navigation,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface BatchOrder {
    id: string;
    total: number;
    delivery_status: string | null;
    buyer_name: string;
    buyer_phone: string | null;
    address_name: string;
    address_village: string | null;
    address_district: string | null;
    items: { product_name: string; quantity: number }[];
}

interface DeliveryBatch {
    id: string;
    village: string;
    district: string | null;
    status: string;
    created_at: string;
    orders: BatchOrder[];
}

const statusOrder = ["created", "assigned", "picked_up", "out_for_delivery", "delivered"];

const getStatusBadge = (status: string) => {
    switch (status) {
        case "delivered":
            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs">✓ Delivered</Badge>;
        case "out_for_delivery":
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">🚚 Out for Delivery</Badge>;
        case "picked_up":
            return <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-xs">📦 Picked Up</Badge>;
        case "assigned":
            return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">📋 Assigned</Badge>;
        default:
            return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs">⏳ Created</Badge>;
    }
};

const DeliveryDashboard = () => {
    const { user } = useAuth();
    const [batches, setBatches] = useState<DeliveryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [partnerStatus, setPartnerStatus] = useState<string>("available");

    const fetchBatches = async () => {
        if (!user) return;
        setLoading(true);

        // Fetch delivery partner profile
        const { data: partnerProfile } = await supabase
            .from("delivery_partners")
            .select("status")
            .eq("user_id", user.id)
            .maybeSingle();

        if (partnerProfile) {
            setPartnerStatus(partnerProfile.status);
        }

        // Fetch batches assigned to this delivery partner
        const { data: batchesData } = await supabase
            .from("delivery_batches")
            .select("*")
            .eq("delivery_partner", user.id)
            .order("created_at", { ascending: false });

        if (!batchesData || batchesData.length === 0) {
            setBatches([]);
            setLoading(false);
            return;
        }

        // Fetch orders for these batches
        const batchIds = batchesData.map((b) => b.id);
        const { data: ordersData } = await supabase
            .from("orders")
            .select("id, total, delivery_status, buyer_id, address_id, batch_id")
            .in("batch_id", batchIds);

        // Fetch buyer profiles
        const buyerIds = [...new Set((ordersData || []).map((o) => o.buyer_id))];
        let profileMap = new Map<string, { name: string; phone: string | null }>();
        if (buyerIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name, phone")
                .in("user_id", buyerIds);
            (profiles || []).forEach((p) =>
                profileMap.set(p.user_id, { name: p.full_name || "Buyer", phone: p.phone })
            );
        }

        // Fetch addresses
        const addressIds = [...new Set((ordersData || []).map((o) => o.address_id).filter(Boolean))] as string[];
        let addressMap = new Map<string, { name: string; village: string | null; district: string | null }>();
        if (addressIds.length > 0) {
            const { data: addrData } = await supabase
                .from("addresses")
                .select("id, name, village, district")
                .in("id", addressIds);
            (addrData || []).forEach((a) =>
                addressMap.set(a.id, { name: a.name, village: a.village, district: a.district })
            );
        }

        // Fetch order items
        const orderIds = (ordersData || []).map((o) => o.id);
        let itemsMap = new Map<string, { product_name: string; quantity: number }[]>();
        if (orderIds.length > 0) {
            const { data: items } = await supabase
                .from("order_items")
                .select("order_id, quantity, products(name)")
                .in("order_id", orderIds);

            (items || []).forEach((item) => {
                const existing = itemsMap.get(item.order_id) || [];
                existing.push({
                    product_name: (item.products as any)?.name || "Unknown",
                    quantity: item.quantity,
                });
                itemsMap.set(item.order_id, existing);
            });
        }

        // Assemble batches
        const enriched: DeliveryBatch[] = batchesData.map((batch) => ({
            ...batch,
            orders: (ordersData || [])
                .filter((o) => o.batch_id === batch.id)
                .map((o) => {
                    const profile = profileMap.get(o.buyer_id);
                    const addr = o.address_id ? addressMap.get(o.address_id) : null;
                    return {
                        id: o.id,
                        total: o.total,
                        delivery_status: o.delivery_status,
                        buyer_name: profile?.name || "Buyer",
                        buyer_phone: profile?.phone || null,
                        address_name: addr?.name || "Unknown",
                        address_village: addr?.village || null,
                        address_district: addr?.district || null,
                        items: itemsMap.get(o.id) || [],
                    };
                }),
        }));

        setBatches(enriched);
        setLoading(false);
    };

    useEffect(() => {
        fetchBatches();
    }, [user]);

    const updateBatchStatus = async (batchId: string, newStatus: string, label: string) => {
        setUpdatingId(batchId);

        // Map batch status to individual order delivery_status
        const orderStatusMap: Record<string, string> = {
            picked_up: "picked_up",
            out_for_delivery: "out_for_delivery",
            delivered: "delivered",
        };

        // Update batch status
        const { error: batchError } = await supabase
            .from("delivery_batches")
            .update({ status: newStatus })
            .eq("id", batchId);

        if (batchError) {
            toast({ title: "Error", description: batchError.message, variant: "destructive" });
            setUpdatingId(null);
            return;
        }

        // Update all orders in this batch
        const orderDeliveryStatus = orderStatusMap[newStatus];
        if (orderDeliveryStatus) {
            const updateData: Record<string, string> = { delivery_status: orderDeliveryStatus };
            if (newStatus === "delivered") {
                updateData.status = "delivered";
            }

            await supabase
                .from("orders")
                .update(updateData)
                .eq("batch_id", batchId);

            // Send notifications to buyers
            const batch = batches.find((b) => b.id === batchId);
            if (batch) {
                const notificationMessages: Record<string, string> = {
                    picked_up: "Your order has been picked up by the delivery partner!",
                    out_for_delivery: "Your order is out for delivery! 🚚",
                    delivered: "Your order has been delivered! 🎉",
                };

                const buyerIds = [...new Set(batch.orders.map((o) => {
                    // We need buyer IDs — fetch from orders
                    return null; // Will use a separate query
                }).filter(Boolean))];

                // Fetch buyer IDs from database
                const { data: batchOrders } = await supabase
                    .from("orders")
                    .select("buyer_id")
                    .eq("batch_id", batchId);

                const uniqueBuyerIds = [...new Set((batchOrders || []).map((o) => o.buyer_id))];
                if (uniqueBuyerIds.length > 0 && notificationMessages[newStatus]) {
                    const notifications = uniqueBuyerIds.map((buyerId) => ({
                        user_id: buyerId,
                        title: "Delivery Update",
                        message: notificationMessages[newStatus],
                        type: "delivery",
                    }));
                    await supabase.from("notifications").insert(notifications);
                }
            }
        }

        toast({ title: `Batch ${label}!`, description: "Status updated for all orders in this batch." });
        fetchBatches();
        setUpdatingId(null);
    };

    const updatePartnerStatus = async (newStatus: string) => {
        if (!user) return;
        const { error } = await supabase
            .from("delivery_partners")
            .update({ status: newStatus })
            .eq("user_id", user.id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setPartnerStatus(newStatus);
            toast({ title: "Status updated", description: `You are now ${newStatus}.` });
        }
    };

    const activeBatches = batches.filter((b) => b.status !== "delivered");
    const completedBatches = batches.filter((b) => b.status === "delivered");
    const totalOrders = batches.reduce((sum, b) => sum + b.orders.length, 0);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-5xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                            Delivery Dashboard
                        </h1>
                        <p className="text-muted-foreground font-body">
                            Manage your assigned delivery batches
                        </p>
                    </motion.div>

                    {/* Partner Status Toggle */}
                    <Card className="shadow-card mb-6">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${partnerStatus === "available" ? "bg-emerald-500" : partnerStatus === "busy" ? "bg-amber-500" : "bg-gray-400"}`} />
                                <span className="font-body text-sm font-semibold text-foreground capitalize">
                                    Status: {partnerStatus}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {["available", "busy", "offline"].map((s) => (
                                    <Button
                                        key={s}
                                        variant={partnerStatus === s ? "default" : "outline"}
                                        size="sm"
                                        className="text-xs capitalize"
                                        onClick={() => updatePartnerStatus(s)}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        {[
                            { icon: Truck, label: "Active Batches", value: String(activeBatches.length) },
                            { icon: Package, label: "Total Orders", value: String(totalOrders) },
                            { icon: CheckCircle, label: "Delivered", value: String(completedBatches.length) },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="shadow-card text-center">
                                    <CardContent className="p-4">
                                        <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                                        <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
                                        <p className="text-xs text-muted-foreground font-body">{stat.label}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Batches */}
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : batches.length === 0 ? (
                        <Card className="shadow-card">
                            <CardContent className="text-center py-10">
                                <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground font-body text-sm">
                                    No batches assigned yet. Stay available to receive deliveries!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {batches.map((batch) => {
                                const isExpanded = expandedBatch === batch.id;
                                const currentStatusIdx = statusOrder.indexOf(batch.status);

                                return (
                                    <Card key={batch.id} className="shadow-card overflow-hidden">
                                        <CardHeader
                                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                                            onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                        <Navigation className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="font-display text-base flex items-center gap-2">
                                                            {batch.village}
                                                            {getStatusBadge(batch.status)}
                                                        </CardTitle>
                                                        <p className="text-xs text-muted-foreground font-body">
                                                            {batch.district && `${batch.district} · `}
                                                            {batch.orders.length} order{batch.orders.length !== 1 ? "s" : ""} ·{" "}
                                                            {new Date(batch.created_at).toLocaleDateString("en-IN")}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                                )}
                                            </div>
                                        </CardHeader>

                                        {isExpanded && (
                                            <CardContent className="pt-0">
                                                {/* Action buttons */}
                                                {batch.status !== "delivered" && (
                                                    <div className="flex gap-2 flex-wrap mb-4 pb-4 border-b border-border">
                                                        {batch.status === "assigned" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => updateBatchStatus(batch.id, "picked_up", "picked up")}
                                                                disabled={updatingId === batch.id}
                                                            >
                                                                {updatingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Package className="w-4 h-4 mr-1" />}
                                                                Mark Picked Up
                                                            </Button>
                                                        )}
                                                        {batch.status === "picked_up" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => updateBatchStatus(batch.id, "out_for_delivery", "out for delivery")}
                                                                disabled={updatingId === batch.id}
                                                            >
                                                                {updatingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
                                                                Mark Out for Delivery
                                                            </Button>
                                                        )}
                                                        {batch.status === "out_for_delivery" && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                                onClick={() => updateBatchStatus(batch.id, "delivered", "delivered")}
                                                                disabled={updatingId === batch.id}
                                                            >
                                                                {updatingId === batch.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                                Mark Delivered
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Orders list */}
                                                <div className="space-y-3">
                                                    {batch.orders.map((order) => (
                                                        <div key={order.id} className="p-3 bg-muted/50 rounded-xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="w-4 h-4 text-primary" />
                                                                    <span className="font-body font-semibold text-sm text-foreground">
                                                                        {order.buyer_name}
                                                                    </span>
                                                                </div>
                                                                <p className="font-body font-bold text-foreground text-sm">₹{order.total}</p>
                                                            </div>

                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-body mb-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {order.address_name}
                                                                {order.address_village && ` — ${order.address_village}`}
                                                                {order.address_district && `, ${order.address_district}`}
                                                            </div>

                                                            {order.buyer_phone && (
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-body mb-2">
                                                                    <Phone className="w-3 h-3" />
                                                                    {order.buyer_phone}
                                                                </div>
                                                            )}

                                                            <div className="text-xs text-muted-foreground font-body">
                                                                {order.items.map((item, i) => (
                                                                    <span key={i}>
                                                                        {item.product_name} x{item.quantity}
                                                                        {i < order.items.length - 1 ? ", " : ""}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default DeliveryDashboard;
