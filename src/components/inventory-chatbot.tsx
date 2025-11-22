"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Bot, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  action?: () => void;
  actionLabel?: string;
}

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  totalStockValue: number;
  criticalStockProducts: Array<{
    id: number;
    name: string;
    currentStock: number;
  }>;
}

export function InventoryChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const initializeChat = async () => {
    setIsLoadingStats(true);
    addBotMessage("👋 Hi! I'm your StockMaster assistant. Let me check your inventory status...");
    
    await fetchStats();
    setIsLoadingStats(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        // Send proactive alerts
        setTimeout(() => {
          sendProactiveAlerts(data);
        }, 800);
      } else {
        addBotMessage("⚠️ I couldn't fetch your inventory data. Please make sure you're logged in.");
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      addBotMessage("❌ I'm having trouble connecting. Please check your internet connection and try again.");
    }
  };

  const sendProactiveAlerts = (data: DashboardStats) => {
    const alerts: string[] = [];
    
    if (data.lowStockCount > 0) {
      alerts.push(`🔴 ${data.lowStockCount} product${data.lowStockCount > 1 ? 's are' : ' is'} running low on stock`);
    }
    
    if (data.pendingReceipts > 0) {
      alerts.push(`📥 ${data.pendingReceipts} receipt${data.pendingReceipts > 1 ? 's' : ''} awaiting validation`);
    }
    
    if (data.pendingDeliveries > 0) {
      alerts.push(`📦 ${data.pendingDeliveries} delivery${data.pendingDeliveries > 1 ? 's' : ''} pending`);
    }
    
    if (data.pendingTransfers > 0) {
      alerts.push(`🔄 ${data.pendingTransfers} transfer${data.pendingTransfers > 1 ? 's' : ''} awaiting approval`);
    }

    if (alerts.length > 0) {
      addBotMessage(
        `📊 Here's your inventory status:\n\n${alerts.join('\n')}\n\n💡 Need help with any of these? Just ask!`
      );
    } else {
      addBotMessage(
        `✅ Great news! Your inventory looks healthy:\n\n• ${data.totalProducts} products in stock\n• No low stock alerts\n• All operations up to date\n• Total value: $${data.totalStockValue.toLocaleString()}\n\n🎯 What would you like to do?`
      );
    }
  };

  const addBotMessage = (content: string, action?: () => void, actionLabel?: string) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: "bot",
      content,
      timestamp: new Date(),
      action,
      actionLabel,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.toLowerCase().trim();
    addUserMessage(inputValue);
    setInputValue("");

    // Show typing indicator
    setIsTyping(true);
    setTimeout(() => {
      processUserIntent(userMessage);
      setIsTyping(false);
    }, 600);
  };

  const processUserIntent = (message: string) => {
    // Dashboard
    if (message.includes("dashboard") || message.includes("overview") || message.includes("home")) {
      addBotMessage(
        "📊 Taking you to the dashboard with your inventory overview...",
        () => router.push("/dashboard"),
        "Open Dashboard"
      );
    }
    // Products
    else if (message.includes("product") || message.includes("item") || message.includes("stock")) {
      if (message.includes("add") || message.includes("new") || message.includes("create")) {
        addBotMessage(
          "➕ I'll take you to the products page where you can add new items.",
          () => router.push("/products"),
          "Add New Product"
        );
      } else {
        addBotMessage(
          "📦 Opening products page where you can manage all inventory items...",
          () => router.push("/products"),
          "View All Products"
        );
      }
    }
    // Low stock
    else if (message.includes("low stock") || message.includes("alert") || message.includes("shortage") || message.includes("reorder")) {
      if (stats && stats.lowStockCount > 0) {
        addBotMessage(
          `⚠️ You have ${stats.lowStockCount} product${stats.lowStockCount > 1 ? 's' : ''} below reorder level. I recommend reviewing these items soon.`,
          () => router.push("/products?filter=lowStock"),
          "View Low Stock Items"
        );
      } else {
        addBotMessage("✅ Excellent! All products are currently above their reorder levels. Your inventory is well-stocked! 🎉");
      }
    }
    // Receipts
    else if (message.includes("receipt") || message.includes("incoming") || message.includes("receive")) {
      if (message.includes("new") || message.includes("create") || message.includes("add")) {
        addBotMessage(
          "📥 I'll help you create a new receipt for incoming stock.",
          () => router.push("/receipts"),
          "Create New Receipt"
        );
      } else if (stats && stats.pendingReceipts > 0) {
        addBotMessage(
          `📋 You have ${stats.pendingReceipts} pending receipt${stats.pendingReceipts > 1 ? 's' : ''} to validate.`,
          () => router.push("/receipts"),
          "View Pending Receipts"
        );
      } else {
        addBotMessage(
          "📥 Opening receipts page for incoming stock management...",
          () => router.push("/receipts"),
          "Go to Receipts"
        );
      }
    }
    // Deliveries
    else if (message.includes("delivery") || message.includes("deliver") || message.includes("ship") || message.includes("outgoing")) {
      if (message.includes("new") || message.includes("create") || message.includes("add")) {
        addBotMessage(
          "📤 I'll help you create a new delivery order.",
          () => router.push("/deliveries"),
          "Create New Delivery"
        );
      } else if (stats && stats.pendingDeliveries > 0) {
        addBotMessage(
          `📦 You have ${stats.pendingDeliveries} pending deliver${stats.pendingDeliveries > 1 ? 'ies' : 'y'} to validate.`,
          () => router.push("/deliveries"),
          "View Pending Deliveries"
        );
      } else {
        addBotMessage(
          "📤 Opening deliveries page for outgoing shipments...",
          () => router.push("/deliveries"),
          "Go to Deliveries"
        );
      }
    }
    // Transfers
    else if (message.includes("transfer") || message.includes("move") || message.includes("internal")) {
      if (message.includes("new") || message.includes("create") || message.includes("add")) {
        addBotMessage(
          "🔄 I'll help you create a new internal transfer.",
          () => router.push("/transfers"),
          "Create New Transfer"
        );
      } else if (stats && stats.pendingTransfers > 0) {
        addBotMessage(
          `🔄 You have ${stats.pendingTransfers} pending transfer${stats.pendingTransfers > 1 ? 's' : ''} to validate.`,
          () => router.push("/transfers"),
          "View Pending Transfers"
        );
      } else {
        addBotMessage(
          "🔄 Opening transfers page for internal stock movements...",
          () => router.push("/transfers"),
          "Go to Transfers"
        );
      }
    }
    // Adjustments
    else if (message.includes("adjustment") || message.includes("adjust") || message.includes("correct")) {
      addBotMessage(
        "⚖️ Opening inventory adjustments for stock corrections...",
        () => router.push("/adjustments"),
        "Go to Adjustments"
      );
    }
    // History
    else if (message.includes("history") || message.includes("ledger") || message.includes("log") || message.includes("audit")) {
      addBotMessage(
        "📜 Opening stock movement history with complete audit trails...",
        () => router.push("/history"),
        "View History"
      );
    }
    // Settings
    else if (message.includes("setting") || message.includes("warehouse") || message.includes("configure") || message.includes("setup")) {
      addBotMessage(
        "⚙️ Taking you to settings for warehouse and system configuration...",
        () => router.push("/settings"),
        "Go to Settings"
      );
    }
    // Profile
    else if (message.includes("profile") || message.includes("account") || message.includes("user")) {
      addBotMessage(
        "👤 Opening your profile page...",
        () => router.push("/profile"),
        "View Profile"
      );
    }
    // Stats queries
    else if (message.includes("how many") || message.includes("total") || message.includes("count") || message.includes("stats")) {
      if (stats) {
        addBotMessage(
          `📊 Here's your inventory summary:\n\n• Total Products: ${stats.totalProducts}\n• Low Stock Items: ${stats.lowStockCount}\n• Pending Receipts: ${stats.pendingReceipts}\n• Pending Deliveries: ${stats.pendingDeliveries}\n• Pending Transfers: ${stats.pendingTransfers}\n• Total Value: $${stats.totalStockValue.toLocaleString()}\n\n💡 Need details on any of these?`
        );
      } else {
        addBotMessage("📊 Let me fetch your latest statistics...");
        fetchStats();
      }
    }
    // Pending operations
    else if (message.includes("pending") || message.includes("awaiting") || message.includes("waiting")) {
      if (stats) {
        const pending = [];
        if (stats.pendingReceipts > 0) {
          pending.push(`📥 ${stats.pendingReceipts} receipt${stats.pendingReceipts > 1 ? 's' : ''}`);
        }
        if (stats.pendingDeliveries > 0) {
          pending.push(`📦 ${stats.pendingDeliveries} deliver${stats.pendingDeliveries > 1 ? 'ies' : 'y'}`);
        }
        if (stats.pendingTransfers > 0) {
          pending.push(`🔄 ${stats.pendingTransfers} transfer${stats.pendingTransfers > 1 ? 's' : ''}`);
        }
        
        if (pending.length > 0) {
          addBotMessage(`⏳ Pending operations requiring validation:\n\n${pending.join('\n')}\n\n💡 Which would you like to review?`);
        } else {
          addBotMessage("✅ Perfect! You have no pending operations at the moment. Everything is up to date! 🎉");
        }
      }
    }
    // Refresh data
    else if (message.includes("refresh") || message.includes("update") || message.includes("reload")) {
      addBotMessage("🔄 Refreshing your inventory data...");
      fetchStats();
    }
    // Help
    else if (message.includes("help") || message.includes("what can you") || message.includes("guide")) {
      addBotMessage(
        "🤖 I'm here to help you manage your inventory! Here's what I can do:\n\n📊 Dashboard & Stats\n📦 Product Management\n⚠️ Low Stock Alerts\n📥 Receipts (Incoming)\n📤 Deliveries (Outgoing)\n🔄 Internal Transfers\n⚖️ Inventory Adjustments\n📜 Movement History\n⚙️ Settings & Warehouses\n\n💬 Just tell me what you need in plain language!"
      );
    }
    // Greeting
    else if (message.includes("hi") || message.includes("hello") || message.includes("hey")) {
      addBotMessage("👋 Hello! How can I assist you with your inventory today? Feel free to ask me anything or use the quick actions below!");
    }
    // Thank you
    else if (message.includes("thank") || message.includes("thanks")) {
      addBotMessage("You're very welcome! I'm always here to help. Let me know if you need anything else! 😊");
    }
    // Default
    else {
      addBotMessage(
        "🤔 I'm not sure I understood that. Here are some things you can try:\n\n💬 Common Requests:\n• 'Show low stock items'\n• 'Open products'\n• 'What's pending?'\n• 'Create new receipt'\n• 'View deliveries'\n• 'Go to dashboard'\n• 'Show me stats'\n\n📌 Or use the quick action buttons below!"
      );
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    initializeChat();
  };

  const quickActions = [
    { label: "📊 Dashboard", query: "Go to dashboard" },
    { label: "📦 Products", query: "View products" },
    { label: "⚠️ Low Stock", query: "Show low stock" },
    { label: "⏳ Pending", query: "What's pending?" },
    { label: "📥 Receipts", query: "Open receipts" },
    { label: "📤 Deliveries", query: "View deliveries" },
  ];

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 h-14 w-14 md:h-16 md:w-16 rounded-full shadow-xl z-50 bg-primary hover:bg-primary/90 hover:scale-110 transition-transform"
          size="icon"
        >
          <MessageSquare className="h-6 w-6 md:h-7 md:w-7" />
          {stats && (stats.lowStockCount > 0 || stats.pendingReceipts > 0 || stats.pendingDeliveries > 0 || stats.pendingTransfers > 0) && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">!</span>
            </span>
          )}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[550px] md:h-[650px] shadow-2xl z-50 flex flex-col border-2 border-primary/20">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">StockMaster Assistant</h3>
                <p className="text-xs text-primary-foreground/90 flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                  Online & Ready
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-primary-foreground hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted shadow-sm"
                    }`}
                  >
                    {message.type === "bot" && (
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1">
                          <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                          {message.action && message.actionLabel && (
                            <Button
                              onClick={message.action}
                              size="sm"
                              className="mt-3 w-full"
                              variant="secondary"
                            >
                              {message.actionLabel} →
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {message.type === "user" && <p className="leading-relaxed">{message.content}</p>}
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setInputValue(action.query);
                    setTimeout(handleSendMessage, 100);
                  }}
                  className="text-xs whitespace-nowrap h-7 px-2.5 flex-shrink-0"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="flex-shrink-0"
                disabled={!inputValue.trim() || isTyping}
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}