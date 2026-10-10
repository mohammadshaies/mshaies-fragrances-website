import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Bot, 
  X, 
  Send, 
  ArrowRight, 
  ShoppingBag, 
  Watch, 
  Heart, 
  Gift, 
  Sun, 
  Moon, 
  CheckCircle2, 
  User,
  SlidersHorizontal,
  Info,
  Truck,
  Tag,
  Compass,
  FileText,
  RotateCcw,
  MessageCircle,
  PackageCheck,
  Search,
  Check
} from "lucide-react";
import { useProductsStore, type Product } from "@/lib/products-store";
import { useCart, formatPKR } from "@/lib/cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { chatAdvisorServerFn } from "@/lib/api/advisor.server";

type Message = {
  id: string;
  sender: "ai" | "user";
  text: string;
  recommendedProducts?: Product[];
  quickReplies?: string[];
  actionLink?: { text: string; to?: string; href?: string; isExternal?: boolean };
  orderInfo?: {
    id: string;
    customerName: string;
    status: string;
    courierName?: string;
    trackingNumber?: string;
    total: number;
    city: string;
  };
};

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  sender: "ai",
  text: "Assalam-o-Alaikum! I am Sentry, your Master Scent Sommelier & Luxury Concierge at M.shaies Fragrances. How can I assist your olfactory journey today?\n\nFeel free to ask for fragrance recommendations, order tracking, longevity advice, or connect directly with our human perfumer.",
  quickReplies: [
    "👑 Best wedding & festive attar",
    "🔥 What is your longest-lasting scent?",
    "☀️ Best summer daily fragrance",
    "📦 Track my order",
    "💬 Chat on WhatsApp",
  ],
};

export function AIScentAdvisor() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"chat" | "quiz">("chat");
  const { products, orders, settings } = useProductsStore();
  const { add } = useCart();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global event listener allowing other website buttons to open Sentry
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 250);
    };
    window.addEventListener("open-ai-advisor", handleOpen);
    return () => window.removeEventListener("open-ai-advisor", handleOpen);
  }, []);

  // Conversation history
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Quiz State
  const [quizStep, setQuizStep] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<{
    category?: string;
    occasion?: string;
    vibe?: string;
    budget?: string;
  }>({});

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (isOpen && activeMode === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, activeMode]);

  // Restart chat
  const handleResetChat = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    toast.success("Chat conversation refreshed!");
  };

  // Construct Live Catalog Context for Sentry
  const catalogContext = products.map((p) => 
    `- "${p.name}" (ID: ${p.id}) | Category: ${p.category} | Volume: ${p.volume} | Price: ₨ ${p.price} | Notes: ${p.notes} | Tagline: ${p.tagline || ""}`
  ).join("\n");

  const systemPrompt = `You are Sentry, the Master Scent Sommelier and Senior Luxury Concierge at M.shaies Fragrances in Pakistan. Your name "Sentry" originates from the art of "Scent" and guarding the royal heritage of fine perfumery.

MAISON IDENTITY & VALUES:
- M.shaies crafts pure alcohol-free attars and high-projection extrait de parfums (35% oil concentration) in Lahore, Pakistan.
- Free nationwide shipping across Pakistan on orders over ₨ 5,000 via TCS and Leopards Express (2 to 4 business days).
- Official WhatsApp Concierge: +92 339 0001829 (https://wa.me/923390001829).
- Official Promo Code: "${settings.announcementCode || "LUXE15"}" for 15% discount.
- Payment Options: Cash on Delivery (COD), JazzCash, Easypaisa, NayaPay, and Bank Transfer.
- 7-Day hassle-free return and exchange policy on sealed bottles.

CRITICAL BEHAVIOR:
1. Speak warmly and charmingly like a human French-trained Eastern perfumer. Never say "I am an AI", "As a language model", or give dry robotic lists.
2. Fluently understand and reply in English, Urdu, or Roman Urdu (e.g. "Bhai garmi ke liye fresh attar batao", "shaadi pe lagane ke liye sabse lasting konsa hai").
3. Suggest exact products from our catalog when relevant.
4. Keep responses punchy and elegant (2-4 sentences max).

M.shaies Catalog:
${catalogContext}`;

  // Smart Order Tracking Resolver
  const checkOrderTracking = (query: string) => {
    const q = query.toLowerCase().trim();
    // Look for patterns like MSH-1001, #1001, 1001, or phone numbers
    const match = q.match(/msh-?[0-9]+/i) || q.match(/#?[0-9]{4,}/);
    if (!match && !q.includes("track") && !q.includes("where is my order")) {
      return null;
    }

    const searchId = match ? match[0].replace(/[^a-z0-9]/gi, "").toUpperCase() : "";
    const cleanDigits = q.replace(/[^0-9]/g, "");

    let found = orders.find((o) => {
      const oId = o.id.replace(/[^a-z0-9]/gi, "").toUpperCase();
      return oId.includes(searchId) || (cleanDigits.length >= 4 && o.phone.includes(cleanDigits));
    });

    if (found) {
      return {
        replyText: `I located your order **${found.id}** for **${found.customerName}**! It is currently marked as **${found.orderStatus}**. It will arrive at ${found.city} via ${found.courierName || "TCS Express"}.`,
        orderInfo: {
          id: found.id,
          customerName: found.customerName,
          status: found.orderStatus,
          courierName: found.courierName || "TCS Express",
          trackingNumber: found.trackingNumber || "Assigned upon dispatch",
          total: found.total,
          city: found.city,
        },
        actionLink: {
          text: "Open WhatsApp Tracking Support",
          href: `https://wa.me/923390001829?text=${encodeURIComponent(`Assalam-o-Alaikum! Please provide tracking status for my order ${found.id}`)}`,
          isExternal: true,
        },
      };
    }

    if (match) {
      return {
        replyText: `I checked our active dispatch ledger for "${searchId}", but couldn't find a matching record. Please verify your Order ID (e.g. MSH-1001) or send your phone number to our WhatsApp Concierge for instant lookup.`,
        actionLink: {
          text: "WhatsApp Tracking Helpline (+92 339 0001829)",
          href: `https://wa.me/923390001829?text=${encodeURIComponent(`Assalam-o-Alaikum, I need help tracking order ${searchId}`)}`,
          isExternal: true,
        },
      };
    }

    return null;
  };

  // High-Grade Sommelier Reasoning Engine
  const getSommelierExpertAdvice = (q: string): { replyText: string; matchedProducts: Product[]; actionLink?: any; quickReplies?: string[] } => {
    const lower = q.toLowerCase();

    // 1. WhatsApp or Direct Contact Request
    if (lower.includes("whatsapp") || lower.includes("phone") || lower.includes("contact") || lower.includes("number") || lower.includes("human") || lower.includes("call")) {
      return {
        replyText: "You can speak directly with our Master Perfumer and Customer Concierge on WhatsApp at **+92 339 0001829**. We assist with bespoke orders, bulk wedding gifting, and immediate nationwide tracking!",
        matchedProducts: [],
        actionLink: {
          text: "Chat on WhatsApp (+92 339 0001829)",
          href: "https://wa.me/923390001829?text=Assalam-o-Alaikum!%20I%20would%20like%20perfume%20advice%20from%20the%20Maison.",
          isExternal: true,
        },
        quickReplies: ["Tell me about pure attars", "Longest lasting perfume", "Wedding recommendations"],
      };
    }

    // 2. Longevity, Sillage & Projection
    if (lower.includes("lasting") || lower.includes("longevity") || lower.includes("stay") || lower.includes("kitni der") || lower.includes("der tak") || lower.includes("projection") || lower.includes("sillage")) {
      const matched = products.filter(p => p.id.includes("dehn") || p.id.includes("midnight-rose") || p.id.includes("ambergris") || p.category === "Attars");
      return {
        replyText: "Our pure attars last **14 to 20+ hours on skin and days on fabric** because they are 100% concentrated botanical & agarwood oils without alcohol evaporation. For maximum sillage, apply on pulse points (wrists, neck, beard) or layer with an Extrait de Parfum!",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "Explore All Pure Attar Oils", to: "/attars" },
        quickReplies: ["Dehn Al Oudh details", "Midnight Rose Attar", "How to apply attar properly?"],
      };
    }

    // 3. Wedding, Festive, Barat & Groom (Dulha)
    if (lower.includes("wedding") || lower.includes("shaadi") || lower.includes("nikkah") || lower.includes("barat") || lower.includes("walima") || lower.includes("groom") || lower.includes("dulha") || lower.includes("dulhan")) {
      const matched = products.filter(p => p.id.includes("dehn") || p.id.includes("midnight-rose") || p.id.includes("oud-al-jamil") || p.category === "Watches");
      return {
        replyText: "For weddings and festive galas in Pakistan, **Dehn Al Oudh Qadeem** and **Midnight Rose Attar** are royalty incarnate. They possess an opulent, unforgettable aura that commands respect in banquet halls.",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "View Luxury Collections", to: "/shop" },
        quickReplies: ["Dehn Al Oudh Qadeem", "Midnight Rose", "Add a luxury watch pairing"],
      };
    }

    // 4. Summer, Heat, Karachi/Lahore Weather, Fresh Citrus
    if (lower.includes("summer") || lower.includes("garmi") || lower.includes("fresh") || lower.includes("citrus") || lower.includes("cool") || lower.includes("sweat") || lower.includes("office")) {
      const matched = products.filter(p => p.notes.toLowerCase().includes("bergamot") || p.notes.toLowerCase().includes("vetiver") || p.category === "Perfumes" || p.notes.toLowerCase().includes("rose"));
      return {
        replyText: "For hot Pakistani summers, heavy dark oils can feel cloying. We recommend crisp Italian bergamot, clean white florals, and airy vetiver accords that stay energetic, crystalline, and fresh all day.",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "Browse Fresh Extrait Perfumes", to: "/perfumes" },
        quickReplies: ["Desert Gold Flacon", "Best daily office scent", "How to get free shipping?"],
      };
    }

    // 5. Jummah, Sacred, Prayer & Alcohol-Free
    if (lower.includes("jummah") || lower.includes("prayer") || lower.includes("namaz") || lower.includes("masjid") || lower.includes("halal") || lower.includes("alcohol") || lower.includes("sunnah") || lower.includes("pak")) {
      const matched = products.filter(p => p.category === "Attars");
      return {
        replyText: "All M.shaies Pure Attar Oils are **100% alcohol-free, halal, and pure distillates** of natural agarwood, amber, and florals—following the revered oriental tradition. They are pristine for Jummah, prayers, and daily spiritual peace.",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "Explore Pure Halal Attars", to: "/attars" },
        quickReplies: ["12ml Pure Attars", "Dehn Al Oudh", "Delivery in Lahore"],
      };
    }

    // 6. International Designer Dupe & Profile Matching (Creed, Tom Ford, Baccarat, Sauvage)
    if (lower.includes("creed") || lower.includes("aventus") || lower.includes("baccarat") || lower.includes("540") || lower.includes("tom ford") || lower.includes("sauvage") || lower.includes("roja") || lower.includes("clive")) {
      const matched = products.filter(p => p.notes.toLowerCase().includes("bergamot") || p.notes.toLowerCase().includes("amber") || p.notes.toLowerCase().includes("leather") || p.id.includes("midnight-rose"));
      return {
        replyText: "While international French and British designer sprays are formulated at 15-18% concentration with alcohol, M.shaies formulations are crafted at **35% Extrait concentration and pure 100% attar oil**—specifically designed to survive Pakistan's climate with richer depth!",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "Discover Haute Parfumerie", to: "/shop" },
        quickReplies: ["Longest lasting fragrance", "What discount code is active?", "Order sample flacon"],
      };
    }

    // 7. Gifting & Watch Pairings
    if (lower.includes("gift") || lower.includes("present") || lower.includes("father") || lower.includes("husband") || lower.includes("brother") || lower.includes("boss") || lower.includes("tuhfa")) {
      const matched = products.filter(p => p.category === "Gift Sets" || p.category === "Watches" || p.id.includes("midnight-rose"));
      return {
        replyText: "For an unforgettable gift, nothing surpasses our hand-poured attars presented in velvet flacon caskets, or an artisanal horology watch crafted from 316L surgical steel and sapphire glass.",
        matchedProducts: matched.slice(0, 3),
        actionLink: { text: "Explore Horology Timepieces", to: "/watches" },
        quickReplies: ["Show watches", "Midnight Rose Attar", "Is gift packaging free?"],
      };
    }

    // 8. Luxury Horology Timepieces
    if (lower.includes("watch") || lower.includes("ghari") || lower.includes("chronograph") || lower.includes("timepiece") || lower.includes("horology")) {
      const matched = products.filter(p => p.category === "Watches");
      return {
        replyText: "M.shaies Horology timepieces are forged from **surgical-grade 316L stainless steel**, scratch-proof sapphire crystal glass, and Japanese precision quartz movements. Each watch comes with a 1-year warranty and arrives in a luxury presentation box.",
        matchedProducts: matched,
        actionLink: { text: "Explore Watches Collection", to: "/watches" },
        quickReplies: ["Chronographe Or Rose", "Warranty details", "Can I pay COD?"],
      };
    }

    // 9. Shipping & Delivery
    if (lower.includes("delivery") || lower.includes("shipping") || lower.includes("charges") || lower.includes("tcs") || lower.includes("leopards") || lower.includes("days") || lower.includes("din") || lower.includes("karachi") || lower.includes("islamabad") || lower.includes("lahore")) {
      return {
        replyText: "We dispatch immediately with **express delivery across all of Pakistan in 2 to 4 business days** via TCS & Leopards! Orders over ₨ 5,000 enjoy **100% Free Shipping**.",
        matchedProducts: [],
        actionLink: { text: "View Customer Care & Delivery", to: "/support" },
        quickReplies: ["How do I pay COD?", "Active promo codes", "Recommend best attar"],
      };
    }

    // 10. Discounts, Coupons & Promo Code
    if (lower.includes("discount") || lower.includes("coupon") || lower.includes("code") || lower.includes("promo") || lower.includes("off") || lower.includes("deal") || lower.includes("sasta")) {
      const code = settings.announcementCode || "LUXE15";
      return {
        replyText: `You can use privilege voucher code **${code}** at checkout for **15% off** your entire order! Plus, orders over ₨ 5,000 qualify for automated Free Nationwide Shipping.`,
        matchedProducts: products.slice(0, 2),
        actionLink: { text: "Go to Checkout & Apply Code", to: "/checkout" },
        quickReplies: ["Shop pure attars", "Shop extrait perfumes", "WhatsApp VIP Concierge"],
      };
    }

    // 11. How to Apply & Layer Fragrances
    if (lower.includes("how to apply") || lower.includes("layer") || lower.includes("lagane ka tariqa") || lower.includes("tarika") || lower.includes("tips")) {
      return {
        replyText: "To get 18+ hours projection: 1) Apply 1 drop of pure attar oil on the pulse points of your wrists and behind each ear. 2) Gently rub onto collar or beard. 3) For a divine scent bubble, spray 2 spritzes of an Extrait de Parfum directly over the oil base.",
        matchedProducts: products.slice(0, 2),
        quickReplies: ["Dehn Al Oudh Qadeem", "Midnight Rose", "What discount code is active?"],
      };
    }

    // 12. Greetings / Pleasantries
    if (lower === "hi" || lower === "hello" || lower === "hey" || lower.includes("salam") || lower.includes("kese ho") || lower.includes("kaise ho") || lower.includes("how are you")) {
      return {
        replyText: "Walaikum Assalam! I'm doing splendidly, thank you for asking! Welcome to M.shaies. Are you looking to discover an heirloom signature fragrance for yourself, or searching for a memorable gift?",
        matchedProducts: products.slice(0, 2),
        quickReplies: ["👑 Best wedding attar", "☀️ Summer fresh scent", "🔥 Longest lasting", "📦 Track my order"],
      };
    }

    // General product match fallback
    const matched = products.filter(p => lower.includes(p.name.toLowerCase()) || p.notes.toLowerCase().split("·").some(n => lower.includes(n.trim())));
    const finalProducts = matched.length > 0 ? matched.slice(0, 3) : products.slice(0, 2);

    return {
      replyText: `Based on your request, here are our finest artisanal selections crafted for projection, sillage, and distinction in Pakistan:`,
      matchedProducts: finalProducts,
      actionLink: { text: "Explore Complete Catalog", to: "/shop" },
      quickReplies: ["Tell me about notes", "What is your longest lasting?", "Chat on WhatsApp"],
    };
  };

  // Main AI Response Pipeline (Gemini -> Pollinations -> Sommelier Core)
  const fetchAIResponse = async (history: Message[], newUserText: string): Promise<{ replyText: string; matchedProducts: Product[]; actionLink?: any; orderInfo?: any; quickReplies?: string[] }> => {
    // 1. First check if it's an Order Tracking query
    const trackingResult = checkOrderTracking(newUserText);
    if (trackingResult) {
      return {
        replyText: trackingResult.replyText,
        matchedProducts: [],
        actionLink: trackingResult.actionLink,
        orderInfo: trackingResult.orderInfo,
        quickReplies: ["Track another order", "Chat with delivery agent on WhatsApp", "Browse new arrivals"],
      };
    }

    // 2. Try Server-Side Gemini API (reads server-only GEMINI_API_KEY)
    try {
      const serverAI = await chatAdvisorServerFn({
        data: {
          history: history.map((m) => ({ sender: m.sender, text: m.text })),
          message: newUserText,
        },
      });

      if (serverAI.success && serverAI.reply && serverAI.reply.trim().length > 5) {
        const reply = serverAI.reply.trim();
        const matchedProducts = products.filter((p) => reply.toLowerCase().includes(p.name.toLowerCase()));
        return {
          replyText: reply,
          matchedProducts: matchedProducts.length > 0 ? matchedProducts : products.slice(0, 2),
          quickReplies: ["Tell me more", "Longest lasting fragrance", "Chat on WhatsApp (+92 339 0001829)"],
        };
      }
    } catch (e) {
      console.warn("Server AI fallback to sommelier engine:", e);
    }

    // 3. Try Pollinations Free LLM with short timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch("https://text.pollinations.ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...history.slice(-4).map((m) => ({
              role: m.sender === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content: newUserText },
          ],
          model: "openai",
          temperature: 0.7,
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 5 && !text.includes("Rate limit")) {
          const matchedProducts = products.filter(p => text.toLowerCase().includes(p.name.toLowerCase()));
          return {
            replyText: text.trim(),
            matchedProducts: matchedProducts.length > 0 ? matchedProducts : products.slice(0, 2),
            quickReplies: ["Tell me about pure attars", "Longest lasting", "WhatsApp Concierge"],
          };
        }
      }
    } catch (e) {
      console.warn("External endpoint fallback to sommelier engine:", e);
    }

    // 4. Guaranteed High-Intelligence Local Sommelier Core
    return getSommelierExpertAdvice(newUserText);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textToSend) setInputText("");
    setIsTyping(true);

    try {
      const aiResult = await fetchAIResponse(updatedHistory, text);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: aiResult.replyText,
        recommendedProducts: aiResult.matchedProducts?.length > 0 ? aiResult.matchedProducts.slice(0, 3) : undefined,
        actionLink: aiResult.actionLink,
        orderInfo: aiResult.orderInfo,
        quickReplies: aiResult.quickReplies,
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (e) {
      console.error(e);
      toast.error("Sentry is reconnecting...");
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuizOption = (key: string, value: string) => {
    const updated = { ...quizAnswers, [key]: value };
    setQuizAnswers(updated);

    if (quizStep < 3) {
      setQuizStep(quizStep + 1);
    } else {
      setActiveMode("chat");
      const summaryQuery = `I am looking for ${updated.category || "a luxury creation"} for ${updated.occasion || "all occasions"} with a ${updated.vibe || "distinguished"} aura on a ${updated.budget || "flexible budget"}. What do you recommend?`;
      handleSendMessage(summaryQuery);
      setQuizStep(0);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button (Bottom-Right Corner with safe mobile offset) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 250);
          }}
          className="relative size-12 sm:size-14 rounded-full bg-[#140e06] border-2 border-gold/80 shadow-2xl grid place-items-center group cursor-pointer"
          aria-label="Ask Sentry AI Scent Sommelier"
          title="Chat with Sentry (Master Scent Sommelier)"
        >
          {/* Subtle Ambient Pulse Ring */}
          <span className="absolute inset-0 rounded-full bg-gold/25 animate-ping opacity-40 pointer-events-none" />

          {/* Golden Sentry Bot Icon */}
          <div className="relative size-6 sm:size-8 grid place-items-center text-amber-300 group-hover:text-white transition-colors">
            <Bot className="size-5 sm:size-7 drop-shadow-md" />
            <Sparkles className="absolute -top-1 -right-1 size-2.5 sm:size-3 text-gold animate-pulse" />
          </div>

          {/* Online Notification Status Indicator */}
          <span className="absolute top-0.5 right-0.5 size-3 sm:size-3.5 rounded-full bg-emerald-500 border-2 border-[#140e06] shadow-sm flex items-center justify-center">
            <span className="size-1 rounded-full bg-white animate-pulse" />
          </span>
        </motion.button>
      </div>

      {/* Sentry Concierge Dialog Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-ink/75 backdrop-blur-sm flex items-center justify-center p-0 sm:p-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card border-0 sm:border-2 border-gold/70 rounded-none sm:rounded-3xl w-full max-w-xl h-full sm:h-[650px] max-h-[100dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
            >
              {/* Luxury Header */}
              <div className="p-3.5 sm:p-4 border-b border-border/80 bg-pearl/60 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-10 rounded-full bg-gold/20 border border-gold/50 grid place-items-center shrink-0">
                    <Bot className="size-5 text-gold-deep" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif text-base sm:text-lg text-ink font-bold flex items-center gap-1.5 truncate">
                      <span>Sentry</span>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-sans font-bold">
                        Sommelier
                      </span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground truncate">
                      Master Perfumer · English & Roman Urdu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* WhatsApp Direct Escalation Button */}
                  <a
                    href="https://wa.me/923390001829?text=Assalam-o-Alaikum!%20I%20would%20like%20perfume%20assistance%20from%20M.shaies."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider hidden xs:flex items-center gap-1 transition-colors"
                    title="Speak with Human Perfumer on WhatsApp"
                  >
                    <MessageCircle className="size-3 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Mode Switcher */}
                  <button
                    onClick={() => setActiveMode(activeMode === "chat" ? "quiz" : "chat")}
                    className="px-2.5 py-1.5 rounded-full border border-border text-[10px] uppercase tracking-wider font-semibold text-muted-foreground hover:text-ink hover:border-gold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="size-3" />
                    <span className="hidden sm:inline">{activeMode === "chat" ? "Scent Quiz" : "Live Chat"}</span>
                  </button>

                  {/* Reset Chat Button */}
                  <button
                    onClick={handleResetChat}
                    className="size-7 sm:size-8 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-ink hover:border-gold transition-colors cursor-pointer"
                    title="Restart Conversation"
                  >
                    <RotateCcw className="size-3 sm:size-3.5" />
                  </button>

                  {/* Close Modal */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="size-7 sm:size-8 rounded-full border border-border grid place-items-center text-muted-foreground hover:text-ink transition-colors cursor-pointer"
                  >
                    <X className="size-3.5 sm:size-4" />
                  </button>
                </div>
              </div>

              {/* Chat View */}
              {activeMode === "chat" && (
                <div className="flex-1 flex flex-col min-h-0 bg-background/50">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 sm:gap-3 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {m.sender === "ai" && (
                          <div className="size-7 rounded-full bg-pearl border border-gold/40 grid place-items-center shrink-0 mt-1">
                            <Bot className="size-3.5 text-gold-deep" />
                          </div>
                        )}

                        <div className={`max-w-[88%] sm:max-w-[85%] space-y-2.5 ${m.sender === "user" ? "text-right" : "text-left"}`}>
                          <div
                            className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                              m.sender === "user"
                                ? "bg-gold text-ink font-semibold rounded-tr-none shadow-md"
                                : "bg-card border border-border/90 text-ink rounded-tl-none shadow-sm"
                            }`}
                          >
                            {m.text}
                          </div>

                          {/* Order Tracking Information Card */}
                          {m.orderInfo && (
                            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-left space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                                  <PackageCheck className="size-3.5" />
                                  Order Verification
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                                  {m.orderInfo.status}
                                </span>
                              </div>
                              <div className="text-xs space-y-1">
                                <p><span className="text-muted-foreground">Order ID:</span> <strong className="font-mono">{m.orderInfo.id}</strong></p>
                                <p><span className="text-muted-foreground">Customer:</span> <strong>{m.orderInfo.customerName}</strong></p>
                                <p><span className="text-muted-foreground">Courier:</span> <strong>{m.orderInfo.courierName}</strong></p>
                                <p><span className="text-muted-foreground">Tracking Number:</span> <strong className="font-mono">{m.orderInfo.trackingNumber}</strong></p>
                                <p><span className="text-muted-foreground">Destination:</span> <strong>{m.orderInfo.city}</strong></p>
                                <p><span className="text-muted-foreground">Total:</span> <strong className="text-gold-deep font-serif">{formatPKR(m.orderInfo.total)}</strong></p>
                              </div>
                            </div>
                          )}

                          {/* Action Navigation Link */}
                          {m.actionLink && (
                            <div>
                              {m.actionLink.isExternal ? (
                                <a
                                  href={m.actionLink.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500 hover:text-white transition-all shadow-xs"
                                >
                                  <MessageCircle className="size-3" />
                                  <span>{m.actionLink.text}</span>
                                  <ArrowRight className="size-3" />
                                </a>
                              ) : (
                                <Link
                                  to={m.actionLink.to || "/shop"}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold/15 text-gold-deep border border-gold/40 text-[11px] font-bold uppercase tracking-wider hover:bg-gold hover:text-ink transition-all shadow-xs"
                                >
                                  <span>{m.actionLink.text}</span>
                                  <ArrowRight className="size-3" />
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Recommended Product Cards inside Chat */}
                          {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {m.recommendedProducts.map((prod) => (
                                <div
                                  key={prod.id}
                                  className="p-3 rounded-2xl border border-gold/40 bg-pearl/60 hover:bg-pearl transition-all flex items-center justify-between gap-3 text-left shadow-sm"
                                >
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="size-12 rounded-xl object-contain bg-background border border-border shrink-0"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[9px] uppercase tracking-wider font-bold text-gold-deep">
                                      {prod.category} · {prod.volume}
                                    </span>
                                    <h4 className="font-serif text-xs sm:text-sm text-ink font-bold truncate">
                                      {prod.name}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {prod.notes}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-serif text-xs font-bold text-ink mb-1">
                                      {formatPKR(prod.price)}
                                    </p>
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        onClick={() => {
                                          add({ id: prod.id, name: prod.name, price: prod.price });
                                          toast.success(`Added ${prod.name} to bag!`);
                                        }}
                                        className="px-2.5 py-1 rounded-full bg-gold text-ink text-[10px] font-bold uppercase tracking-wider hover:bg-gold-deep hover:text-white transition-colors cursor-pointer"
                                      >
                                        + Bag
                                      </button>
                                      <Link
                                        to="/product/$id"
                                        params={{ id: prod.id }}
                                        onClick={() => setIsOpen(false)}
                                        className="p-1 rounded-full border border-border hover:border-gold text-muted-foreground hover:text-ink text-[10px]"
                                        title="View Specs"
                                      >
                                        <ArrowRight className="size-3" />
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick Reply Prompts */}
                          {m.quickReplies && m.quickReplies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.quickReplies.map((reply) => (
                                <button
                                  key={reply}
                                  onClick={() => handleSendMessage(reply)}
                                  className="text-[10px] px-2.5 py-1 rounded-full border border-gold/40 bg-card hover:bg-pearl text-ink/80 hover:text-ink font-medium transition-colors cursor-pointer"
                                >
                                  {reply}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Typing Animation indicator */}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-gold-deep text-xs font-medium pl-10">
                        <div className="size-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="size-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="size-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="text-[10px] uppercase tracking-wider font-bold">Sentry is formulating advice...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Horizontal Quick Pills Above Input */}
                  <div className="px-3 pt-2 pb-1 border-t border-border/60 bg-pearl/20 flex gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      { label: "👑 Wedding Attar", query: "Best wedding & festive attar" },
                      { label: "🔥 Longest Lasting", query: "What is your longest lasting fragrance?" },
                      { label: "☀️ Summer Fresh", query: "Best summer daily perfume" },
                      { label: "📦 Track Order", query: "Where is my order? Track status" },
                      { label: "💬 WhatsApp Us", query: "Give WhatsApp contact number" },
                    ].map((pill, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(pill.query)}
                        className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border border-border/80 hover:border-gold hover:text-gold-deep bg-card text-muted-foreground whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* Input Form */}
                  <div className="p-3 sm:p-4 border-t border-border/80 bg-pearl/30">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Ask Sentry: 'Best wedding attar', 'Track MSH-1001', or 'Summer notes'..."
                        className="flex-1 bg-background border border-border/80 rounded-full px-4 py-2.5 text-base sm:text-xs text-ink focus:outline-none focus:border-gold placeholder:text-muted-foreground"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isTyping}
                        className="size-10 rounded-full bg-gold text-ink grid place-items-center hover:bg-gold-deep hover:text-white transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
                      >
                        <Send className="size-4" />
                      </button>
                    </form>
                    <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                      💡 Powered by M.shaies Sommelier Intelligence · Roman Urdu & English supported
                    </p>
                  </div>
                </div>
              )}

              {/* Scent Quiz View */}
              {activeMode === "quiz" && (
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col justify-between bg-background/50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <span className="text-[10px] uppercase tracking-widest text-gold-deep font-bold">
                        Bespoke Scent Profile · Step {quizStep + 1} of 4
                      </span>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`size-2 rounded-full transition-colors ${
                              step === quizStep ? "bg-gold scale-125" : step < quizStep ? "bg-gold/40" : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <h4 className="font-serif text-lg sm:text-xl text-ink font-bold">
                      {quizStep === 0 && "What creation are you seeking today?"}
                      {quizStep === 1 && "What is the primary occasion?"}
                      {quizStep === 2 && "What olfactory vibe appeals to your presence?"}
                      {quizStep === 3 && "What is your target investment budget?"}
                    </h4>

                    {/* Step 0: Category */}
                    {quizStep === 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[
                          { title: "Pure Attar Oils", desc: "100% alcohol-free concentrated oil", val: "Attars" },
                          { title: "Extrait Perfumes (EDP)", desc: "High-projection spray perfumes", val: "Perfumes" },
                          { title: "Luxury Watches", desc: "Surgical steel & sapphire crystal", val: "Watches" },
                          { title: "Fragrance & Watch Pairing", desc: "Coordinated luxury ensemble", val: "Pairing" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => handleQuizOption("category", opt.val)}
                            className="p-4 rounded-2xl border border-border bg-card hover:border-gold hover:bg-pearl/80 text-left transition-all cursor-pointer shadow-xs"
                          >
                            <p className="font-serif text-sm sm:text-base text-ink font-semibold">{opt.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 1: Occasion */}
                    {quizStep === 1 && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[
                          { title: "Weddings & Festive Galas", icon: Sparkles, val: "wedding and formal galas" },
                          { title: "Daily Signature & Office", icon: Sun, val: "everyday office and business" },
                          { title: "Jummah & Spiritual", icon: Heart, val: "Jummah prayers and sacred gatherings" },
                          { title: "Intimate Evening Dates", icon: Moon, val: "evening romantic occasions" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => handleQuizOption("occasion", opt.val)}
                            className="p-4 rounded-2xl border border-border bg-card hover:border-gold hover:bg-pearl/80 text-left transition-all flex flex-col justify-between cursor-pointer shadow-xs"
                          >
                            <opt.icon className="size-5 text-gold-deep mb-2" />
                            <p className="font-serif text-sm sm:text-base text-ink font-semibold">{opt.title}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 2: Vibe */}
                    {quizStep === 2 && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[
                          { title: "Royal Smoky Oud & Amber", desc: "Dark, commanding, traditional depth", val: "smoky oud and royal amber" },
                          { title: "Velvet Taif Rose & Florals", desc: "Sweet, noble, romantic sillage", val: "velvet rose and floral bouquet" },
                          { title: "Crisp Bergamot & Citrus", desc: "Zesty, uplifting, energetic freshness", val: "fresh bergamot and crisp citrus" },
                          { title: "Warm Tonka & Vanilla", desc: "Comforting, sensual gourmand warmth", val: "warm vanilla and tonka bean" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => handleQuizOption("vibe", opt.val)}
                            className="p-4 rounded-2xl border border-border bg-card hover:border-gold hover:bg-pearl/80 text-left transition-all cursor-pointer shadow-xs"
                          >
                            <p className="font-serif text-sm sm:text-base text-ink font-semibold">{opt.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 3: Budget */}
                    {quizStep === 3 && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {[
                          { title: "Under ₨ 10,000", val: "under ₨ 10,000" },
                          { title: "₨ 10,000 – ₨ 20,000", val: "between ₨ 10,000 and ₨ 20,000" },
                          { title: "₨ 20,000 – ₨ 50,000", val: "between ₨ 20,000 and ₨ 50,000" },
                          { title: "Above ₨ 50,000 (VIP / Horology)", val: "luxury tier above ₨ 50,000" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => handleQuizOption("budget", opt.val)}
                            className="p-4 rounded-2xl border border-border bg-card hover:border-gold hover:bg-pearl/80 text-left transition-all cursor-pointer shadow-xs"
                          >
                            <p className="font-serif text-sm sm:text-base text-ink font-semibold">{opt.title}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-border/80">
                    <button
                      onClick={() => setQuizStep(Math.max(0, quizStep - 1))}
                      disabled={quizStep === 0}
                      className="text-xs uppercase tracking-wider text-muted-foreground hover:text-ink disabled:opacity-30 cursor-pointer"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setActiveMode("chat")}
                      className="text-xs uppercase tracking-wider font-semibold text-gold-deep hover:underline cursor-pointer"
                    >
                      Switch to Open Chat →
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
