import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardList, ShieldCheck, Upload, UserPlus } from "lucide-react";

const steps = [
    { icon: UserPlus, title: "1. Sign Up", desc: "Create your account and choose 'Seller' as your role." },
    { icon: Upload, title: "2. Upload FSSAI License", desc: "Upload your valid FSSAI license number and certificate for verification." },
    { icon: ShieldCheck, title: "3. Get Verified", desc: "Our admin team reviews and approves your FSSAI documents." },
    { icon: ClipboardList, title: "4. Add Products", desc: "List your products with photos, prices, and descriptions. Start receiving orders!" },
];

const SellerGuidePage = () => (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
            <div className="container max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Seller Guide</h1>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Everything you need to know to start selling on Ullas in four simple steps.
                    </p>
                </motion.div>

                <div className="space-y-5 mb-10">
                    {steps.map((s, i) => (
                        <motion.div key={s.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                            <Card className="shadow-card">
                                <CardContent className="flex items-start gap-4 p-6">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <s.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-display font-semibold text-foreground mb-1">{s.title}</h3>
                                        <p className="text-sm text-muted-foreground font-body">{s.desc}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-center">
                    <Card className="shadow-card bg-primary/5 border-primary/20">
                        <CardContent className="p-8">
                            <h3 className="font-display font-bold text-foreground text-lg mb-2">Ready to start selling?</h3>
                            <p className="text-muted-foreground font-body text-sm mb-4">
                                Join hundreds of Kudumbashree women already growing their businesses on Ullas.
                            </p>
                            <Button asChild size="lg">
                                <Link to="/become-seller">Start Selling Now</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
        <Footer />
    </div>
);

export default SellerGuidePage;
