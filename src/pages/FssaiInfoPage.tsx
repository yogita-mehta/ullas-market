import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ShieldCheck, FileText, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const FssaiInfoPage = () => (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
            <div className="container max-w-4xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">FSSAI Information</h1>
                    <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
                        Understanding FSSAI certification and why it matters for food sellers.
                    </p>
                </motion.div>

                <div className="space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="shadow-card">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex items-start gap-3 mb-4">
                                    <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h2 className="font-display font-bold text-foreground text-lg mb-2">What is FSSAI?</h2>
                                        <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                            The Food Safety and Standards Authority of India (FSSAI) is a government body responsible
                                            for regulating and supervising food safety. An FSSAI license is a mandatory requirement
                                            for any food business operator in India, ensuring that food products meet safety and quality standards.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="shadow-card">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h2 className="font-display font-bold text-foreground text-lg mb-2">Why is it Required?</h2>
                                        <ul className="text-muted-foreground font-body text-sm space-y-2">
                                            <li>• <strong>Legal compliance:</strong> All food businesses in India must have an FSSAI license</li>
                                            <li>• <strong>Consumer safety:</strong> Ensures products are prepared in hygienic conditions</li>
                                            <li>• <strong>Buyer trust:</strong> Verified sellers get more orders on our platform</li>
                                            <li>• <strong>Quality assurance:</strong> Products meet food safety standards</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="shadow-card">
                            <CardContent className="p-6 sm:p-8">
                                <div className="flex items-start gap-3 mb-4">
                                    <FileText className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h2 className="font-display font-bold text-foreground text-lg mb-2">How to Get an FSSAI License</h2>
                                        <ol className="text-muted-foreground font-body text-sm space-y-2 list-decimal list-inside">
                                            <li>Visit the FSSAI Food Licensing portal</li>
                                            <li>Register and fill out the application form</li>
                                            <li>Upload required documents (ID proof, address proof, food category)</li>
                                            <li>Pay the registration fee (starts at ₹100 for basic registration)</li>
                                            <li>Receive your 14-digit FSSAI license number</li>
                                        </ol>
                                        <Button variant="outline" size="sm" className="mt-4" asChild>
                                            <a href="https://foscos.fssai.gov.in" target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="w-4 h-4 mr-1" /> Visit FSSAI Portal
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
        <Footer />
    </div>
);

export default FssaiInfoPage;
