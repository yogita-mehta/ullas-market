import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const stories = [
    {
        name: "Lakshmi Devi",
        unit: "Kudumbashree Unit, Thrissur",
        story: "I started making banana chips from my kitchen. Within 3 months on Ullas, I was shipping across Kerala. My monthly income tripled!",
        product: "Banana Chips & Snacks",
        rating: 4.8,
    },
    {
        name: "Sobha Kumari",
        unit: "Kudumbashree Unit, Kottayam",
        story: "FSSAI verification gave my customers confidence. Now I get repeat orders every week for my special mango pickle.",
        product: "Traditional Pickles",
        rating: 4.9,
    },
    {
        name: "Anjali Menon",
        unit: "Kudumbashree Unit, Ernakulam",
        story: "Ullas helped me turn my grandmother's halwa recipe into a real business. I now employ two other women from my unit.",
        product: "Homemade Sweets",
        rating: 4.7,
    },
    {
        name: "Priya Nair",
        unit: "Kudumbashree Unit, Alappuzha",
        story: "From selling at local fairs to delivering across the state — Ullas made it possible. The platform is so easy to use!",
        product: "Spice Blends",
        rating: 4.9,
    },
];

const SuccessStoriesPage = () => (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
            <div className="container max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Success Stories</h1>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Real stories from Kudumbashree women who transformed their kitchens into thriving businesses.
                    </p>
                </motion.div>

                <div className="space-y-6">
                    {stories.map((s, i) => (
                        <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <Card className="shadow-card overflow-hidden">
                                <CardContent className="p-6 sm:p-8">
                                    <div className="flex items-start gap-3 mb-4">
                                        <Quote className="w-8 h-8 text-primary/20 flex-shrink-0 mt-1" />
                                        <p className="text-foreground font-body leading-relaxed italic">"{s.story}"</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                                        <div>
                                            <p className="font-display font-semibold text-foreground text-sm">{s.name}</p>
                                            <p className="text-xs text-muted-foreground font-body">{s.unit}</p>
                                            <p className="text-xs text-primary font-body mt-0.5">{s.product}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-primary fill-primary" />
                                            <span className="text-sm font-body font-semibold text-foreground">{s.rating}</span>
                                        </div>
                                    </div>
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

export default SuccessStoriesPage;
