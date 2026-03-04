import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Heart, Users, Globe, ShieldCheck } from "lucide-react";

const values = [
    { icon: Heart, title: "Empowerment", desc: "Supporting rural women entrepreneurs to build sustainable businesses from their kitchens." },
    { icon: Users, title: "Community", desc: "Connecting Kudumbashree self-help groups directly with health-conscious consumers across Kerala." },
    { icon: Globe, title: "Authenticity", desc: "Preserving traditional Kerala recipes and food heritage through a trusted digital marketplace." },
    { icon: ShieldCheck, title: "Trust", desc: "Every seller is FSSAI verified to ensure food safety and quality for every customer." },
];

const AboutPage = () => (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
            <div className="container max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">About Ullas</h1>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Ullas – The Joy of Growth – is a marketplace that empowers rural women entrepreneurs in Kerala
                        to sell authentic, homemade food products directly to customers.
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="shadow-card mb-10">
                        <CardContent className="p-8">
                            <h2 className="text-xl font-display font-bold text-foreground mb-4">Our Mission</h2>
                            <p className="text-muted-foreground font-body leading-relaxed mb-4">
                                We believe that every Kudumbashree woman has the talent and skill to build a thriving food business.
                                Ullas provides the digital platform, compliance support, and market access they need to reach
                                customers far beyond their local neighborhoods.
                            </p>
                            <p className="text-muted-foreground font-body leading-relaxed">
                                By requiring FSSAI verification for all sellers, we ensure that every product on our platform
                                meets the highest standards of food safety — giving buyers confidence and sellers credibility.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <h2 className="text-xl font-display font-bold text-foreground mb-6 text-center">Our Values</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {values.map((v, i) => (
                        <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                            <Card className="shadow-card h-full">
                                <CardContent className="p-6">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                        <v.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-display font-semibold text-foreground mb-2">{v.title}</h3>
                                    <p className="text-sm text-muted-foreground font-body">{v.desc}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
        <Footer />
    </div>
);

export default AboutPage;
