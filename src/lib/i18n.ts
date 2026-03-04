import { useAuth } from "@/contexts/AuthContext";

type Language = "en" | "ml";

const translations: Record<string, Record<Language, string>> = {
    // Nav
    "nav.home": { en: "Home", ml: "ഹോം" },
    "nav.marketplace": { en: "Marketplace", ml: "മാർക്കറ്റ്‌പ്ലേസ്" },
    "nav.dashboard": { en: "Dashboard", ml: "ഡാഷ്ബോർഡ്" },
    "nav.admin": { en: "Admin", ml: "അഡ്മിൻ" },
    "nav.becomeSeller": { en: "Become Seller", ml: "വിൽപ്പനക്കാരനാകുക" },
    "nav.signOut": { en: "Sign Out", ml: "സൈൻ ഔട്ട്" },
    "nav.logIn": { en: "Log In", ml: "ലോഗിൻ" },
    "nav.startSelling": { en: "Start Selling", ml: "വിൽപ്പന തുടങ്ങുക" },
    "nav.language": { en: "ML", ml: "EN" },

    // Auth
    "auth.createAccount": { en: "Create Account", ml: "അക്കൗണ്ട് സൃഷ്ടിക്കുക" },
    "auth.signIn": { en: "Sign In", ml: "സൈൻ ഇൻ" },
    "auth.welcomeBack": { en: "Welcome Back", ml: "സ്വാഗതം" },
    "auth.fullName": { en: "Full Name", ml: "പൂർണ്ണ നാമം" },
    "auth.email": { en: "Email", ml: "ഇമെയിൽ" },
    "auth.password": { en: "Password", ml: "പാസ്‌വേഡ്" },
    "auth.selectRole": { en: "I want to", ml: "എനിക്ക് വേണ്ടത്" },
    "auth.buyProducts": { en: "Buy Products", ml: "ഉൽപ്പന്നങ്ങൾ വാങ്ങുക" },
    "auth.sellProducts": { en: "Sell Products", ml: "ഉൽപ്പന്നങ്ങൾ വിൽക്കുക" },
    "auth.forgotPassword": { en: "Forgot password?", ml: "പാസ്‌വേഡ് മറന്നോ?" },
    "auth.noAccount": { en: "Don't have an account?", ml: "അക്കൗണ്ട് ഇല്ലേ?" },
    "auth.hasAccount": { en: "Already have an account?", ml: "അക്കൗണ്ട് ഉണ്ടോ?" },
    "auth.signUp": { en: "Sign up", ml: "സൈൻ അപ്" },
    "auth.creating": { en: "Creating account...", ml: "അക്കൗണ്ട് സൃഷ്ടിക്കുന്നു..." },
    "auth.signingIn": { en: "Signing in...", ml: "സൈൻ ഇൻ ചെയ്യുന്നു..." },

    // Marketplace
    "market.title": { en: "Marketplace", ml: "മാർക്കറ്റ്‌പ്ലേസ്" },
    "market.subtitle": { en: "Authentic homemade products from FSSAI verified sellers", ml: "FSSAI സാക്ഷ്യപ്പെടുത്തിയ വിൽപ്പനക്കാരിൽ നിന്നുള്ള ആധികാരിക ഉൽപ്പന്നങ്ങൾ" },
    "market.search": { en: "Search products...", ml: "ഉൽപ്പന്നങ്ങൾ തിരയുക..." },
    "market.filters": { en: "Filters", ml: "ഫിൽട്ടറുകൾ" },
    "market.buyNow": { en: "Buy Now", ml: "ഇപ്പോൾ വാങ്ങുക" },
    "market.outOfStock": { en: "Out of Stock", ml: "സ്റ്റോക്ക് തീർന്നു" },
    "market.noProducts": { en: "No products found", ml: "ഉൽപ്പന്നങ്ങൾ കണ്ടെത്തിയില്ല" },
    "market.fssaiVerified": { en: "FSSAI Verified", ml: "FSSAI സാക്ഷ്യപ്പെടുത്തി" },

    // Categories
    "cat.all": { en: "All", ml: "എല്ലാം" },
    "cat.snacks": { en: "Snacks", ml: "ലഘുഭക്ഷണം" },
    "cat.pickles": { en: "Pickles", ml: "അച്ചാർ" },
    "cat.sweets": { en: "Homemade Sweets", ml: "വീട്ടിലുണ്ടാക്കിയ മധുരം" },
    "cat.traditional": { en: "Traditional Food", ml: "പരമ്പരാഗത ഭക്ഷണം" },
    "cat.spices": { en: "Spices", ml: "മസാലകൾ" },
    "cat.readyToEat": { en: "Ready-to-Eat", ml: "റെഡി-ടു-ഈറ്റ്" },

    // Seller
    "seller.dashboard": { en: "Seller Dashboard", ml: "വിൽപ്പനക്കാരന്റെ ഡാഷ്ബോർഡ്" },
    "seller.myProducts": { en: "My Products", ml: "എന്റെ ഉൽപ്പന്നങ്ങൾ" },
    "seller.addProduct": { en: "Add Product", ml: "ഉൽപ്പന്നം ചേർക്കുക" },
    "seller.incomingOrders": { en: "Incoming Orders", ml: "ഓർഡറുകൾ" },
    "seller.totalProducts": { en: "Total Products", ml: "ആകെ ഉൽപ്പന്നങ്ങൾ" },
    "seller.totalEarnings": { en: "Total Earnings", ml: "ആകെ വരുമാനം" },
    "seller.activeOrders": { en: "Active Orders", ml: "സജീവ ഓർഡറുകൾ" },
    "seller.speakToAdd": { en: "🎤 Speak to add", ml: "🎤 പറഞ്ഞ് ചേർക്കുക" },
    "seller.listening": { en: "🔴 Listening...", ml: "🔴 കേൾക്കുന്നു..." },

    // Buyer
    "buyer.myOrders": { en: "My Orders", ml: "എന്റെ ഓർഡറുകൾ" },
    "buyer.trackPurchases": { en: "Track your purchases and manage payments", ml: "നിങ്ങളുടെ വാങ്ങലുകൾ ട്രാക്ക് ചെയ്യുക" },
    "buyer.orderHistory": { en: "Order History", ml: "ഓർഡർ ചരിത്രം" },
    "buyer.noOrders": { en: "No orders yet. Start shopping!", ml: "ഓർഡറുകൾ ഇല്ല. ഷോപ്പിംഗ് തുടങ്ങുക!" },
    "buyer.browseMarketplace": { en: "Browse Marketplace", ml: "മാർക്കറ്റ്‌പ്ലേസ് ബ്രൗസ് ചെയ്യുക" },
    "buyer.writeReview": { en: "Write Review", ml: "അവലോകനം എഴുതുക" },

    // Order statuses
    "status.pending": { en: "Pending", ml: "തീർപ്പാക്കാത്തത്" },
    "status.accepted": { en: "Accepted", ml: "അംഗീകരിച്ചു" },
    "status.shipped": { en: "Shipped", ml: "അയച്ചു" },
    "status.delivered": { en: "Delivered", ml: "ഡെലിവർ ചെയ്തു" },
    "status.cancelled": { en: "Cancelled", ml: "റദ്ദാക്കി" },
    "status.paymentPending": { en: "Payment Pending", ml: "പേയ്മെന്റ് തീർപ്പാക്കാത്തത്" },
    "status.paymentPaid": { en: "Paid", ml: "പണം നൽകി" },
    "status.paymentFailed": { en: "Payment Failed", ml: "പേയ്മെന്റ് പരാജയപ്പെട്ടു" },

    // Actions
    "action.markAccepted": { en: "Accept", ml: "അംഗീകരിക്കുക" },
    "action.markShipped": { en: "Mark Shipped", ml: "അയച്ചതായി അടയാളപ്പെടുത്തുക" },
    "action.markDelivered": { en: "Mark as Delivered", ml: "ഡെലിവർ ചെയ്തതായി അടയാളപ്പെടുത്തുക" },
    "action.markPaid": { en: "Mark as Paid", ml: "പണം നൽകിയതായി" },

    // Onboarding
    "onboard.title": { en: "What are you interested in?", ml: "നിങ്ങൾക്ക് താൽപ്പര്യമുള്ളത്?" },
    "onboard.subtitle": { en: "Select your favorite categories to personalize your feed", ml: "നിങ്ങളുടെ ഫീഡ് വ്യക്തിഗതമാക്കാൻ ഇഷ്ടമുള്ള വിഭാഗങ്ങൾ തിരഞ്ഞെടുക്കുക" },
    "onboard.continue": { en: "Continue to Marketplace", ml: "മാർക്കറ്റ്‌പ്ലേസിലേക്ക് തുടരുക" },

    // Reviews
    "review.title": { en: "Write a Review", ml: "അവലോകനം എഴുതുക" },
    "review.rating": { en: "Rating", ml: "റേറ്റിംഗ്" },
    "review.comment": { en: "Your Review", ml: "നിങ്ങളുടെ അവലോകനം" },
    "review.submit": { en: "Submit Review", ml: "അവലോകനം സമർപ്പിക്കുക" },

    // Admin
    "admin.title": { en: "Admin Panel", ml: "അഡ്മിൻ പാനൽ" },
    "admin.sellers": { en: "Sellers", ml: "വിൽപ്പനക്കാർ" },
    "admin.products": { en: "Products", ml: "ഉൽപ്പന്നങ്ങൾ" },
    "admin.orders": { en: "Orders", ml: "ഓർഡറുകൾ" },
    "admin.verify": { en: "Verify", ml: "സാക്ഷ്യപ്പെടുത്തുക" },
    "admin.reject": { en: "Reject", ml: "നിരസിക്കുക" },
    "admin.delete": { en: "Delete", ml: "ഇല്ലാതാക്കുക" },
};

export function useTranslation() {
    const { language } = useAuth();
    const lang = (language || "en") as Language;

    function t(key: string): string {
        return translations[key]?.[lang] || translations[key]?.en || key;
    }

    return { t, language: lang };
}

export default translations;
