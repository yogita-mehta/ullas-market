import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const faqs = [
    { q: "How do I place an order?", a: "Browse the Marketplace, find a product you like, and click 'Buy Now'. You'll be prompted to log in if you haven't already. After ordering, you can mark the payment as completed from your Buyer Dashboard." },
    { q: "How do I track my order?", a: "Go to your Buyer Dashboard to see all your orders, their current status, and payment information." },
    { q: "How do I become a seller?", a: "Click 'Become Seller' in the navigation, fill in your business details and FSSAI license number, and wait for admin verification. Once approved, you can start adding products." },
    { q: "What is FSSAI verification?", a: "FSSAI (Food Safety and Standards Authority of India) certification is mandatory for all food businesses in India. We require this to ensure all products on our platform are safe and compliant." },
    { q: "How long does seller verification take?", a: "Our admin team typically reviews applications within 24–48 hours. You'll receive a notification once your verification is approved or if we need additional information." },
    { q: "How do I receive payments?", a: "When a buyer marks an order as paid, you'll receive a notification. The payment status is tracked separately from the order delivery status." },
    { q: "Can I sell non-food products?", a: "Currently, Ullas is focused exclusively on homemade food products. We may expand to other categories in the future." },
    { q: "How do I contact support?", a: "You can reach us through the Contact Us page or email us at support@ullas.in." },
];

const HelpCenterPage = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="pt-24 pb-20">
                <div className="container max-w-3xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Help Center</h1>
                        <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                            Find answers to frequently asked questions about Ullas.
                        </p>
                    </motion.div>

                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card className="shadow-card overflow-hidden">
                                    <button
                                        className="w-full text-left p-5 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                                        onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                    >
                                        <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-body font-semibold text-foreground text-sm">{faq.q}</p>
                                            {openIdx === i && (
                                                <p className="text-sm text-muted-foreground font-body mt-2 leading-relaxed">{faq.a}</p>
                                            )}
                                        </div>
                                        {openIdx === i ? (
                                            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                                        )}
                                    </button>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default HelpCenterPage;
