import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const sections = [
    {
        title: "1. Information We Collect",
        content: "We collect information you provide when creating an account (name, email, phone number, address), seller business information (FSSAI license, business name), and order details. We may also collect usage data such as pages visited and device information."
    },
    {
        title: "2. How We Use Your Information",
        content: "Your information is used to: provide and improve our marketplace services, process orders and payments, verify seller FSSAI credentials, communicate order updates and notifications, and ensure platform safety and compliance."
    },
    {
        title: "3. Data Sharing",
        content: "We share your information only as necessary: buyer names and addresses are shared with sellers for order fulfillment, seller business names and FSSAI status are visible to buyers, and we may share data with authorities if legally required."
    },
    {
        title: "4. Data Security",
        content: "We use industry-standard security measures including encrypted data transmission (HTTPS), secure authentication via Supabase, and row-level security policies to ensure users can only access their own data."
    },
    {
        title: "5. Your Rights",
        content: "You have the right to: access your personal data, request correction of inaccurate data, delete your account and associated data, and opt out of marketing communications."
    },
    {
        title: "6. Cookies and Tracking",
        content: "We use essential cookies for authentication and session management. We do not use third-party advertising trackers."
    },
    {
        title: "7. Changes to This Policy",
        content: "We may update this privacy policy from time to time. We will notify registered users of significant changes via email or platform notifications."
    },
    {
        title: "8. Contact",
        content: "For privacy-related inquiries, please contact us at support@ullas.in or through our Contact Us page."
    },
];

const PrivacyPolicyPage = () => (
    <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
            <div className="container max-w-3xl">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">Privacy Policy</h1>
                    <p className="text-sm text-muted-foreground font-body">
                        Last updated: March 2026
                    </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="shadow-card mb-6">
                        <CardContent className="p-6 sm:p-8">
                            <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                Ullas ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains
                                how we collect, use, and protect your personal information when you use our marketplace platform.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <div className="space-y-4">
                    {sections.map((s, i) => (
                        <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                            <Card className="shadow-card">
                                <CardContent className="p-6">
                                    <h2 className="font-display font-semibold text-foreground mb-2">{s.title}</h2>
                                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{s.content}</p>
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

export default PrivacyPolicyPage;
