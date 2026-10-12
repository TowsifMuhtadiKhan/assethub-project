import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  askLifeNestAi,
  getStoredGeminiKey,
  saveStoredGeminiKey,
  type ChatMessage,
} from "../../services/aiAssistantService";

const STORAGE_CHAT_KEY = "lifenest_ai_chat_history";

export function AskAiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredGeminiKey());
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "welcome-1",
        sender: "ai",
        text: "👋 **Hello! I'm your LifeNest AI Assistant.**\n\nI have real-time access to your personal and family records — including **tasks, vehicle fitness, vault documents, family members, rental properties, and warranties**.\n\nWhat would you like to know today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reliable Auto-scroll to bottom of messages (ensures latest message is always visible on mobile & desktop)
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Immediate scroll to bottom
      scrollToBottom("auto");
      // Delayed scroll after animations and layout calculations finalize
      const t1 = setTimeout(() => scrollToBottom("smooth"), 80);
      const t2 = setTimeout(() => scrollToBottom("smooth"), 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, messages, loading]);

  // Save chat to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Global event & keyboard shortcut (Ctrl+J or Cmd+J)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("lifenest:open-ai-assistant", handleOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("lifenest:open-ai-assistant", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const aiReplyText = await askLifeNestAi(textToSend, messages);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Sorry, I encountered an error while reviewing your records. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const fresh: ChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: "👋 Chat cleared. How can I assist you with your family and asset records?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
    setMessages(fresh);
    sessionStorage.removeItem(STORAGE_CHAT_KEY);
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredGeminiKey(apiKeyInput);
    setApiKeySaved(true);
    setTimeout(() => {
      setApiKeySaved(false);
      setApiKeyModal(false);
    }, 1200);
  };

  // Simple Markdown renderer for bullet points, bold text, and code
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4
            key={idx}
            className="text-xs font-bold text-slate-900 mt-2.5 mb-1.5 pb-0.5 border-b border-slate-100 flex items-center gap-1.5"
          >
            {line.replace("### ", "")}
          </h4>
        );
      }
      // Bullet items
      if (line.startsWith("* ") || line.startsWith("- ") || line.startsWith("• ")) {
        const clean = line.replace(/^[\*\-•]\s*/, "");
        return (
          <li key={idx} className="text-xs text-slate-700 ml-3.5 list-disc my-1 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(clean) }} />
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-1" />;
      }
      return (
        <p
          key={idx}
          className="text-xs text-slate-700 my-0.5 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
        />
      );
    });
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-900'>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em class='italic text-slate-700'>$1</em>")
      .replace(
        /`([^`]+)`/g,
        "<code class='bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-semibold border border-slate-200/60'>$1</code>",
      );
  };

  const quickPrompts = [
    { label: "📅 Expiring docs", prompt: "What documents in my vault are expiring soon?" },
    { label: "🚗 Car fitness due", prompt: "When is my vehicle BRTA fitness and tax token expiring?" },
    { label: "📋 Active tasks", prompt: "What are my high priority pending tasks?" },
    { label: "👨‍👩‍👧 Family members", prompt: "Who is in my family directory?" },
    { label: "🏢 Rental units", prompt: "Give me an overview of my properties and rental units." },
    { label: "📊 Summary", prompt: "Give me an executive summary of all my assets and records." },
  ];

  return (
    <>
      {/* 1. Floating Sparkly "Ask AI" Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Ask LifeNest AI (Ctrl+J)"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-indigo-600/35 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-600/50 transition-all cursor-pointer group active:scale-95 ring-2 ring-white/30"
        >
          <div className="relative flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          </div>
          <span className="tracking-tight">Ask AI</span>
          <span className="hidden sm:inline-block rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-mono text-indigo-100">
            Ctrl+J
          </span>
        </button>
      )}

      {/* 2. Interactive AI Assistant Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:p-5 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:w-[480px] h-[88dvh] sm:h-[640px] max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-indigo-950/20 text-slate-900 overflow-hidden animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-50">
                  <Bot className="h-5 w-5" />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 leading-tight">
                    <span>LifeNest AI</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[9px] font-bold border border-emerald-200/70">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Grounded
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Live context from your authentic records
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setApiKeyModal(true)}
                  title="Configure Gemini API Key"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close AI Assistant"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Prompt Pills (Scrollbar strictly hidden) */}
            <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(qp.prompt)}
                  disabled={loading}
                  className="whitespace-nowrap rounded-full bg-white border border-slate-200/90 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs active:scale-95"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
              {messages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-50 to-purple-100 text-indigo-700 mt-0.5 border border-indigo-200/60 shadow-2xs">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isUser
                          ? "bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md shadow-slate-900/10 rounded-tr-xs"
                          : "bg-white border border-slate-200/90 text-slate-800 shadow-xs rounded-tl-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      ) : (
                        <div>{renderFormattedText(m.text)}</div>
                      )}
                      <div
                        className={`text-[9px] mt-1.5 text-right font-medium ${
                          isUser ? "text-indigo-200/70" : "text-slate-400"
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>

                    {isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white mt-0.5 shadow-2xs ring-1 ring-slate-800">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 justify-start items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-50 to-purple-100 text-indigo-700 border border-indigo-200/60 shadow-2xs">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  </div>
                  <div className="rounded-full bg-white border border-slate-200 px-3.5 py-1.5 text-xs text-slate-500 shadow-2xs flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
                    Checking your real records...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-100 bg-white pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 p-1.5 pl-4 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all shadow-inner"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about bike chassis, car fitness, family, tasks..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none transition-all cursor-pointer"
                  title="Send query"
                >
                  <Send className="h-3.5 w-3.5 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. Optional Gemini API Key Dialog */}
      {apiKeyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-in fade-in duration-150"
          onClick={() => setApiKeyModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Google Gemini AI (Optional)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApiKeyModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="mt-3 space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                LifeNest AI works <strong>100% out-of-the-box</strong> using our built-in offline engine. To enable advanced generative reasoning via Google Gemini Flash, paste your free Gemini API key below:
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Gemini API Key:
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 font-mono outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {apiKeySaved && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  API key saved successfully!
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <div className="flex items-center gap-2">
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKeyInput("");
                        saveStoredGeminiKey("");
                        setApiKeySaved(true);
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
