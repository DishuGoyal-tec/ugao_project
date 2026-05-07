import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  MapPin,
  Search,
  ShoppingCart,
  HelpCircle,
  Package,
  Leaf,
  User,
  Globe,
  Sprout,
  Info,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getChatResponse } from "./geminiChat";
import type { ChatResult } from "./geminiChat";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  type?: "text" | "gallery" | "channels";
  sources?: string[];
};

type QuickAction = {
  label: string;
  query: string;
  icon: React.ReactNode;
  url?: string;
};



type Channel = {
  name: string;
  link: string;
  icon: React.ReactNode;
};

type ChatMode = "general" | "advisor" | "channels" | "products";
type Theme = "jungle" | "terracotta";

const SYSTEM_PROMPT = `You are UgaooBot, a warm and friendly customer support assistant for Ugaoo — India's trusted online plant store. Always respond in a helpful, conversational tone as if you are speaking to a plant lover. Keep answers clear and concise. End every response with a friendly follow-up suggestion or question to keep the conversation going. Never respond with raw data or technical jargon.`;

const MODE_FAQS: Record<ChatMode, QuickAction[]> = {
  general: [
    { label: "What plants are best for indoors?", query: "What plants are best for indoors?", icon: <Leaf size={14} /> },
    { label: "Which plants are under ₹500?", query: "Which plants are under ₹500?", icon: <ShoppingCart size={14} /> },
    { label: "What if my plant arrives damaged?", query: "What if my plant arrives damaged?", icon: <HelpCircle size={14} /> },
  ],
  advisor: [
    { label: "Which plant is best for low sunlight indoors?", query: "Which plant is best for low sunlight indoors?", icon: <Sun size={14} /> },
    { label: "How often should I water a Snake Plant?", query: "How often should I water a Snake Plant?", icon: <HelpCircle size={14} /> },
    { label: "Which plant purifies air the most?", query: "Which plant purifies air the most?", icon: <Leaf size={14} /> },
  ],
  channels: [
    { label: "Where can I buy Ugaoo plants online?", query: "Where can I buy Ugaoo plants online?", icon: <Globe size={14} /> },
    { label: "Is Ugaoo available on Amazon and Flipkart?", query: "Is Ugaoo available on Amazon and Flipkart?", icon: <ShoppingCart size={14} /> },
    { label: "Do you deliver through Blinkit?", query: "Do you deliver through Blinkit?", icon: <ExternalLink size={14} /> },
  ],
  products: [
    { label: "What plants are under ₹500?", query: "What plants are under ₹500?", icon: <ShoppingCart size={14} /> },
    { label: "Show me your bestselling plants", query: "Show me your bestselling plants", icon: <Sprout size={14} /> },
    { label: "Do you have plants good for gifting?", query: "Do you have plants good for gifting?", icon: <Leaf size={14} /> },
  ],
};

const CHANNELS: Channel[] = [
  { name: "Amazon", link: "https://www.amazon.in/s?k=Ugaoo&ref=ams_pages", icon: <ShoppingCart size={18} /> },
  { name: "Flipkart", link: "https://www.flipkart.com/home-improvement/lawn-and-gardening/plants-and-planters/plants-saplings/ugaoo~brand/pr?sid=h1m,um7,sd1,a6l", icon: <ShoppingCart size={18} /> },
  { name: "Blinkit", link: "https://blinkit.com/s/?q=Ugaoo", icon: <ShoppingCart size={18} /> },
  { name: "Ugaoo Website", link: "https://www.ugaoo.com/?srsltid=AfmBOoo7yv9qh99t2cXXzD2RS2-AE6jbbhm_PYODtxwQXM_NQvokmK3f", icon: <Globe size={18} /> },
];

const THEMES: { id: Theme; label: string; color: string }[] = [
  { id: "terracotta", label: "Light Mode", color: "bg-[#fdf8f5] border-[#eddcd2]" },
  { id: "jungle", label: "Dark Mode", color: "bg-[#091a11] border-[#2b7a44]" },
];

type CatalogTile = {
  emoji: string;
  title: string;
  description: string;
  url: string;
};

const CATALOG_TILES: CatalogTile[] = [
  { emoji: "🪴", title: "Pots & Planters", description: "50+ varieties from ₹99", url: "https://www.ugaoo.com/collections/planters" },
  { emoji: "🌱", title: "Seeds", description: "Grow your own at home", url: "https://www.ugaoo.com/collections/seeds" },
  { emoji: "🌿", title: "Live Plants", description: "Indoor & outdoor beauties", url: "https://www.ugaoo.com/collections/plants" },
  { emoji: "🧪", title: "Fertilisers & Care", description: "Nourish & protect your plants", url: "https://www.ugaoo.com/collections/plant-care" },
  { emoji: "🎁", title: "Gifting", description: "Green gifts for loved ones", url: "https://www.ugaoo.com/pages/corporate-gifting" },
  { emoji: "🛠️", title: "Tools", description: "Essential gardening gear", url: "https://www.ugaoo.com/collections/garden-tools" },
];

const CITIES = [
  { name: "Bengaluru", performance: "95.2%", orders: "12,406" },
  { name: "Mumbai", performance: "94.8%", orders: "10,195" },
  { name: "Delhi", performance: "93.9%", orders: "7,265" },
  { name: "Pune", performance: "94.5%", orders: "5,622" },
  { name: "Hyderabad", performance: "94.1%", orders: "4,054" },
  { name: "Chennai", performance: "93.5%", orders: "2,941" },
  { name: "Kolkata", performance: "93.8%", orders: "1,954" },
  { name: "Ahmedabad", performance: "94.6%", orders: "1,549" },
  { name: "Gurgaon", performance: "95.0%", orders: "984" },
  { name: "Jaipur", performance: "93.2%", orders: "931" },
];

export default function App() {
  const [theme, setTheme] = useState<Theme>("terracotta");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<ChatMode>("general");
  const [selectedCityName, setSelectedCityName] = useState<string>("Bengaluru");


  const selectedCity = CITIES.find(c => c.name === selectedCityName) || CITIES[0];

  const messagesRef = useRef<Message[]>([
    {
      id: "1",
      role: "model",
      text: "Namaste! I'm **UgaooBot**. I can help you find the perfect plant, track your green babies, or explain how to keep them thriving. How can I grow your happiness today? 🌱",
      timestamp: new Date(),
    },
  ]);
  const [messages, setMessages] = useState<Message[]>(messagesRef.current);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userSound = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3"));
  const botSound = useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"));

  const toggleTheme = () => {
    setTheme(prev => prev === "terracotta" ? "jungle" : "terracotta");
  };

  useEffect(() => {
    // Apply theme to html, body, and the root element
    const root = document.getElementById('root');
    const elements = [document.documentElement, document.body, root].filter(Boolean) as HTMLElement[];
    THEMES.forEach(t => elements.forEach(el => el.classList.remove(`theme-${t.id}`)));
    elements.forEach(el => el.classList.add(`theme-${theme}`));
    
    // Force a small style recalculation hint
    document.body.style.display = 'none';
    document.body.offsetHeight; // trigger reflow
    document.body.style.display = '';
  }, [theme]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && messages.length > 1) {
      if (lastMessage.role === "model") {
        botSound.current.play().catch(() => {});
      } else {
        userSound.current.play().catch(() => {});
      }
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string, isQuickAction = false) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      // For quick-action FAQ buttons, prepend a system persona so the RAG backend
      // responds in a warm customer-support tone rather than raw technical data.
      const queryText = isQuickAction
        ? `${SYSTEM_PROMPT}\n\nCustomer question: ${text}`
        : text;

      history.push({ role: "user", parts: [{ text: queryText }] });

      const result: ChatResult = await getChatResponse(history);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: result.response,
        timestamp: new Date(),
        sources: result.sources.length > 0 ? result.sources : undefined,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "Oops, something went wrong with my plant wisdom. Let's try again in a moment! 🌱",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleModeChange = (mode: ChatMode) => {
    setActiveMode(mode);
    const modePrompts: Record<ChatMode, string> = {
      general: "I'm back for general help! How can I assist you with Ugaoo today?",
      advisor: "I'm in **Plant Advisor** mode! 🌿 I'm ready to help you choose the best plants for your space or give you expert care tips. What's on your mind?",
      channels: "Exploring **Shop Channels**? 🛒 We are available across multiple platforms for your convenience. Click any link below to visit our official stores:",
      products: "Looking for **Ugaoo Catalog**? 🪴 We have live plants, seeds, fertilizers, and tools. Check out our main categories below:",
    };

    const newMessages: Message[] = [
      {
        id: Date.now().toString(),
        role: "model",
        text: modePrompts[mode],
        timestamp: new Date()
      }
    ];

    if (mode === "products") {
      newMessages.push({
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "Browse our premium categories:",
        timestamp: new Date(),
        type: "gallery"
      });
    }

    if (mode === "channels") {
      newMessages.push({
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "Here are the direct links to our official stores:",
        timestamp: new Date(),
        type: "channels"
      });
    }

    setMessages(prev => [...prev, ...newMessages]);
  };

  return (
    <div className={`flex h-screen w-full transition-all duration-500 bg-theme-bg text-theme-text overflow-hidden theme-${theme}`}>
      {/* Sidebar Toggle Button (Floating when sidebar is closed) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-ugaoo-green text-white rounded-full shadow-2xl hover:bg-ugaoo-accent transition-colors"
          >
            <ChevronRight size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 320 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
        className="h-full bg-theme-sidebar border-r border-theme-border flex flex-col overflow-hidden relative flex-shrink-0"
      >
        <div className="p-8 flex flex-col gap-8 h-full min-w-[320px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-ugaoo-green rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl">
                U
              </div>
              <div>
                <span className="text-xl font-bold block leading-tight">UgaooBot</span>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Plant Assistant</span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            <span className="sidebar-label">Navigation</span>
            {[
              { id: "general", label: "Chat with Ugaoo Bot", icon: MessageSquare },
              { id: "advisor", label: "Plant Advisor", icon: Sprout },
              { id: "channels", label: "Shop Channels", icon: Globe },
              { id: "products", label: "Ugaoo Catalog", icon: ShoppingCart },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id as ChatMode)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeMode === mode.id
                    ? "bg-ugaoo-green text-white shadow-md active:scale-95"
                    : "hover:bg-black/5"
                }`}
              >
                <mode.icon size={18} />
                {mode.label}
              </button>
            ))}

            <div className="mt-8 pt-6 border-t border-theme-border/50">
              <span className="sidebar-label">Appearance</span>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs font-bold text-theme-text-muted">
                  {theme === "terracotta" ? "Light Mode" : "Dark Mode"}
                </span>
                <button
                  onClick={toggleTheme}
                  className={`relative w-14 h-8 rounded-full transition-all duration-300 flex items-center p-1 cursor-pointer bg-white shadow-[inner_0_2px_4px_rgba(0,0,0,0.05)] border border-theme-border/50`}
                  aria-label="Toggle Theme"
                >
                  <motion.div
                    animate={{ x: theme === "jungle" ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="w-6 h-6 rounded-full bg-[#f1f3f5] shadow-sm flex items-center justify-center"
                  >
                    {theme === "jungle" ? (
                      <Moon size={14} className="text-ugaoo-green" />
                    ) : (
                      <Sun size={14} className="text-[#a0a3b1]" />
                    )}
                  </motion.div>
                </button>
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-6 border-t border-theme-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-semibold">Online & Helpful</span>
            </div>
            <p className="text-[10px] opacity-60 font-medium">
              &copy; 2024 Ugaoo Plant Bot
            </p>
          </div>
        </div>
      </motion.aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 bg-theme-bg relative overflow-hidden transition-all duration-500">
        {/* Header */}
        <header className="px-10 py-6 border-b border-theme-border flex justify-between items-center bg-theme-bg/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="mr-2 p-1 hover:bg-black/5 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-ugaoo-green/10 flex items-center justify-center text-ugaoo-green">
              <Leaf size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Garden Assistant</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 font-bold text-xs px-4 py-2 rounded-full border border-theme-border shadow-sm transition-all bg-theme-sidebar">
              <MapPin size={14} className="text-ugaoo-green" />
              <div className="flex flex-col">
                <select 
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-theme-text font-bold text-[11px]"
                >
                  {CITIES.map(c => (
                    <option key={c.name} value={c.name} className="bg-theme-bg">{c.name}</option>
                  ))}
                </select>
                <span className="text-[8px] opacity-40 -mt-1">{selectedCity.orders} Orders</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-theme-text-muted">
                Perfect Order Delivery:
              </span>
              <span className="text-[10px] font-mono font-bold text-ugaoo-green">
                {selectedCity.performance}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 scroll-smooth overflow-x-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex gap-4 max-w-4xl w-full ${message.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl shadow-md ${
                  message.role === "model" ? "bg-ugaoo-green text-white" : "bg-[#FF4B4B] text-white"
                }`}>
                  {message.role === "model" ? <Leaf size={22} /> : <User size={22} />}
                </div>
                
                {message.type === "channels" ? (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    width: "100%",
                    marginTop: "8px",
                  }}>
                    {CHANNELS.map((channel, i) => (
                      <motion.a
                        key={channel.name}
                        href={channel.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          gap: "4px",
                          padding: "16px",
                          background: "var(--color-sidebar, #ffffff)",
                          border: "1.5px solid #a5d6a7",
                          borderRadius: "14px",
                          textDecoration: "none",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 8px rgba(46,125,50,0.06)",
                          width: "100%",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "#2E7D32";
                          el.style.boxShadow = "0 4px 16px rgba(46,125,50,0.18)";
                          el.style.transform = "translateY(-2px)";
                          el.style.background = "#f1f8f1";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "#a5d6a7";
                          el.style.boxShadow = "0 2px 8px rgba(46,125,50,0.06)";
                          el.style.transform = "translateY(0)";
                          el.style.background = "var(--color-sidebar, #ffffff)";
                        }}
                      >
                        <span style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#2E7D32",
                        }}>{channel.name}</span>
                        <span style={{
                          fontSize: "11px",
                          color: "#666",
                          wordBreak: "break-all",
                        }}>{channel.link}</span>
                      </motion.a>
                    ))}
                  </div>
                ) : message.type === "gallery" ? (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "repeat(3, 1fr)",
                    gap: "10px",
                    width: "100%",
                    marginTop: "8px",
                  }}>
                    {CATALOG_TILES.map((tile, i) => (
                      <motion.a
                        key={tile.title}
                        href={tile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "14px 10px",
                          height: "110px",
                          background: "var(--color-sidebar, #ffffff)",
                          border: "1.5px solid #a5d6a7",
                          borderRadius: "14px",
                          textDecoration: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: "0 2px 8px rgba(46,125,50,0.06)",
                          textAlign: "center",
                          width: "100%",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "#2E7D32";
                          el.style.boxShadow = "0 4px 16px rgba(46,125,50,0.18)";
                          el.style.transform = "translateY(-2px)";
                          el.style.background = "#f1f8f1";
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLAnchorElement;
                          el.style.borderColor = "#a5d6a7";
                          el.style.boxShadow = "0 2px 8px rgba(46,125,50,0.06)";
                          el.style.transform = "translateY(0)";
                          el.style.background = "var(--color-sidebar, #ffffff)";
                        }}
                      >
                        <span style={{ fontSize: "28px", lineHeight: 1 }}>{tile.emoji}</span>
                        <span style={{
                          fontWeight: 700,
                          fontSize: "12px",
                          color: "#2E7D32",
                          lineHeight: "1.2",
                        }}>{tile.title}</span>
                        <span style={{
                          fontSize: "10px",
                          color: "#888",
                          fontWeight: 500,
                          lineHeight: "1.2",
                        }}>{tile.description}</span>
                      </motion.a>
                    ))}
                  </div>
                ) : (
                  <div className={`group relative transition-all hover:shadow-lg ${message.role === "model" ? "chat-bubble-bot" : "chat-bubble-user"}`}>
                    <div className="markdown-content">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                    {/* Source attribution — only for bot messages with source data */}
                    {message.role === "model" && message.sources && message.sources.length > 0 && (
                      <p style={{
                        marginTop: "8px",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        fontSize: "10px",
                        fontStyle: "italic",
                        color: "#9e9e9e",
                        lineHeight: 1.4,
                      }}>
                        📄 Source: {message.sources.join(" · ")}
                      </p>
                    )}
                    <span className="absolute -bottom-5 right-0 text-[10px] opacity-40 font-medium group-hover:opacity-100 transition-opacity">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                key="typing-indicator"
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex gap-4 max-w-xs"
              >
                {/* Bot avatar with spinning leaf */}
                <div className="w-10 h-10 rounded-xl bg-ugaoo-green flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <Leaf size={22} className="animate-spin-slow" />
                </div>

                {/* Thinking bubble */}
                <div className="chat-bubble-bot flex flex-col gap-1.5 px-5 py-3 min-w-0">
                  {/* Label */}
                  <span className="text-[11px] font-semibold text-ugaoo-green tracking-wide whitespace-nowrap">
                    UgaooBot is thinking...
                  </span>
                  {/* Animated dots */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-ugaoo-green"
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          duration: 0.55,
                          repeat: Infinity,
                          repeatType: "loop",
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Interaction Area */}
        <div className="px-10 pb-8 pt-4 border-t border-theme-border shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] transition-all bg-theme-bg/50 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {MODE_FAQS[activeMode].map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.url) {
                    window.open(action.url, '_blank');
                  } else {
                    handleSend(action.query, true);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap border border-ugaoo-green/30 text-ugaoo-green hover:bg-ugaoo-green hover:text-white bg-theme-bg"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="group relative max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How can I help you grow your garden today?"
              className="w-full bg-theme-sidebar border border-theme-border rounded-2xl px-6 py-5 pr-16 focus:outline-none focus:ring-4 focus:ring-ugaoo-green/10 focus:border-ugaoo-green transition-all shadow-inner font-medium placeholder:opacity-50 text-theme-text"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-ugaoo-green text-white flex items-center justify-center disabled:opacity-30 transition-all hover:bg-ugaoo-accent shadow-lg shadow-ugaoo-green/20 active:scale-90"
            >
              <Send size={24} />
            </button>
          </form>
          <p className="mt-4 text-[11px] opacity-40 text-center font-bold uppercase tracking-[0.2em] text-theme-text">
            UgaooBot 🌱 Professional Plant Wisdom
          </p>
        </div>
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
