import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Bell, BellOff, CheckCheck, Loader2, ShoppingCart,
    CreditCard, Shield, Info, ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
    order: { icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-100" },
    payment: { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-100" },
    verification: { icon: Shield, color: "text-violet-600", bg: "bg-violet-100" },
    info: { icon: Info, color: "text-amber-600", bg: "bg-amber-100" },
};

const NotificationsPage = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<string | null>(null);

    const fetchNotifications = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setNotifications(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, [user]);

    const markAsRead = async (id: string) => {
        setMarkingId(id);
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
        }
        setMarkingId(null);
    };

    const markAllAsRead = async () => {
        if (!user) return;
        setMarkingAll(true);
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            toast({ title: "All caught up!", description: "All notifications marked as read." });
        }
        setMarkingAll(false);
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                                <Link to="/seller">
                                    <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                                </Link>
                            </Button>
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <Badge className="bg-primary text-primary-foreground text-xs">
                                    {unreadCount} new
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground font-body text-sm pl-8">
                            Stay updated on orders, payments, and more
                        </p>
                    </motion.div>

                    {/* Mark all as read */}
                    {unreadCount > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="mb-4 flex justify-end"
                        >
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={markAllAsRead}
                                disabled={markingAll}
                                className="text-xs"
                            >
                                {markingAll ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                ) : (
                                    <CheckCheck className="w-4 h-4 mr-1" />
                                )}
                                Mark all as read
                            </Button>
                        </motion.div>
                    )}

                    {/* Notification list */}
                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle className="font-display text-lg flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary" />
                                All Notifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-16">
                                    <BellOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-body text-sm mb-1">
                                        No notifications yet
                                    </p>
                                    <p className="text-muted-foreground/60 font-body text-xs">
                                        You'll be notified when you receive orders or payments.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {notifications.map((notif, i) => {
                                        const config = typeConfig[notif.type] || typeConfig.info;
                                        const Icon = config.icon;

                                        return (
                                            <motion.div
                                                key={notif.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${notif.is_read
                                                        ? "bg-muted/30"
                                                        : "bg-muted/60 border border-primary/10"
                                                    }`}
                                            >
                                                <div
                                                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}
                                                >
                                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p
                                                                className={`font-body text-sm ${notif.is_read
                                                                        ? "text-muted-foreground"
                                                                        : "font-semibold text-foreground"
                                                                    }`}
                                                            >
                                                                {notif.title}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-body mt-0.5">
                                                                {notif.message}
                                                            </p>
                                                        </div>
                                                        {!notif.is_read && (
                                                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-xs text-muted-foreground/60 font-body">
                                                            {formatTime(notif.created_at)}
                                                        </p>
                                                        {!notif.is_read && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-6 px-2 text-primary hover:text-primary"
                                                                onClick={() => markAsRead(notif.id)}
                                                                disabled={markingId === notif.id}
                                                            >
                                                                {markingId === notif.id ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    "Mark read"
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default NotificationsPage;
