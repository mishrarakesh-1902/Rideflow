import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendCopilotMessage } from "@/services/copilot";
import { X, Send, Loader2, RotateCcw, Sparkles } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; text: string };

const CopilotChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showMascotSign, setShowMascotSign] = useState(true);

  const getGreeting = (): ChatMsg => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        return {
          role: "assistant",
          text: `Hi ${u.name || "there"}! 👋 I'm your RideFlow AI Assistant. How can I help you today? Ask about your rides, fares, or book a trip directly!`,
        };
      } catch (e) {}
    }
    return {
      role: "assistant",
      text: "Hi! 🚀 I'm your RideFlow AI Assistant. How can I help you? Feel free to ask about our features, safety, dynamic pricing, or how to get started!",
    };
  };

  const [msgs, setMsgs] = useState<ChatMsg[]>([getGreeting()]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resetChat = () => {
    setMsgs([getGreeting()]);
    setHistory([]);
    setInput("");
  };

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, loading, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setMsgs((m) => [...m, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const { reply, history: newHistory, booking } = await sendCopilotMessage(
        userText,
        history.slice(-10)
      );
      setHistory(newHistory);
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);

      if (booking) {
        window.dispatchEvent(new CustomEvent("ai:booking-created", { detail: booking }));
      }
    } catch (e: any) {
      console.error("Copilot request error:", e);
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text:
            e?.response?.data?.message ||
            "Sorry, I had trouble processing that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="fixed bottom-2 right-4 z-50 flex items-end select-none animate-in slide-in-from-right-10 duration-500 ease-out">
        {/* Signboard Stand + Full Cartoon Character */}
        <div className="relative flex items-end">
          {/* Signboard held by character */}
          {showMascotSign && (
            <div
              onClick={() => setOpen(true)}
              className="group cursor-pointer mr-[-12px] mb-5 bg-slate-900/95 border border-cyan-500/50 hover:border-cyan-400 text-white rounded-xl p-2.5 shadow-2xl backdrop-blur-xl max-w-[175px] transition-all hover:scale-105 hover:-translate-y-0.5 relative z-20"
            >
              {/* Dismiss X */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMascotSign(false);
                }}
                className="absolute -top-2 -left-2 w-4 h-4 bg-slate-800 hover:bg-slate-700 border border-white/20 rounded-full flex items-center justify-center text-slate-400 hover:text-white text-[9px] transition-colors shadow-sm"
                title="Hide sign"
              >
                ✕
              </button>

              {/* Signboard Header */}
              <div className="flex items-center gap-1 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">
                  AI ASSISTANT
                </span>
              </div>

              {/* Signboard Content */}
              <p className="text-[11px] font-bold text-slate-100 leading-tight">
                How can I help you?
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">
                Tap to book rides, check fares, or ask questions!
              </p>

              {/* Signpost stick going down */}
              <div className="absolute -bottom-5 right-5 w-1 h-5 bg-gradient-to-b from-cyan-600 to-slate-700 rounded-full -z-10 shadow-xs" />
            </div>
          )}

          {/* Full Body Cartoon Robot Mascot */}
          <div
            onClick={() => setOpen(true)}
            className="cursor-pointer group relative flex flex-col items-center hover:scale-105 transition-all duration-300 z-10"
            title="Click to talk with your AI Assistant"
          >
            {/* Ambient Glow Aura */}
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md animate-pulse pointer-events-none" />

            {/* SVG Full Body Cartoon Character */}
            <svg
              className="w-20 h-26 sm:w-22 sm:h-28 transition-transform duration-300 group-hover:rotate-2 drop-shadow-xl"
              viewBox="0 0 120 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Antenna with Glowing Pulse Bulb */}
              <line x1="60" y1="30" x2="60" y2="12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
              <circle cx="60" y2="12" cy="12" r="6" fill="#00F0FF" className="animate-pulse" />
              <circle cx="60" cy="12" r="8" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Robot Head Base */}
              <rect x="25" y="28" width="70" height="52" rx="20" fill="url(#headGradient)" stroke="#0284C7" strokeWidth="2.5" />
              <rect x="29" y="32" width="62" height="44" rx="16" fill="#0284C7" opacity="0.3" />

              {/* Ears / Headset */}
              <rect x="15" y="44" width="10" height="20" rx="5" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" />
              <rect x="95" y="44" width="10" height="20" rx="5" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" />

              {/* Dark Visor Screen */}
              <rect x="34" y="38" width="52" height="32" rx="10" fill="#090D16" />

              {/* Expressive Glowing Eyes */}
              <g className="animate-pulse">
                <ellipse cx="48" cy="52" rx="6" ry="7" fill="#38BDF8" />
                <ellipse cx="72" cy="52" rx="6" ry="7" fill="#38BDF8" />
                {/* Eye Highlights */}
                <circle cx="50" cy="49" r="2" fill="#FFFFFF" />
                <circle cx="74" cy="49" r="2" fill="#FFFFFF" />
              </g>

              {/* Happy Smile */}
              <path d="M53 62C56 65 64 65 67 62" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />

              {/* Neck Connector */}
              <rect x="52" y="80" width="16" height="8" rx="3" fill="#64748B" />

              {/* Robot Torso / Jacket */}
              <path
                d="M36 88C36 84 46 83 60 83C74 83 84 84 84 88L88 120C88 123 80 125 60 125C40 125 32 123 32 120L36 88Z"
                fill="url(#bodyGradient)"
                stroke="#0284C7"
                strokeWidth="2"
              />

              {/* RideFlow Chest Badge */}
              <rect x="48" y="93" width="24" height="14" rx="4" fill="#090D16" />
              <circle cx="55" cy="100" r="3" fill="#38BDF8" />
              <line x1="61" y1="98" x2="68" y2="98" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              <line x1="61" y1="102" x2="66" y2="102" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />

              {/* Left Arm (Holding Signpost) */}
              <path d="M35 94C24 98 18 106 18 114" stroke="#0EA5E9" strokeWidth="6" strokeLinecap="round" />
              <circle cx="18" cy="114" r="5" fill="#6366F1" />

              {/* Right Arm (Waving Hand) */}
              <g className="animate-bounce" style={{ animationDuration: "2s" }}>
                <path d="M85 94C96 90 104 80 106 72" stroke="#0EA5E9" strokeWidth="6" strokeLinecap="round" />
                <circle cx="106" cy="72" r="6" fill="#6366F1" />
                <circle cx="108" cy="68" r="2.5" fill="#6366F1" />
              </g>

              {/* Cute Robot Legs / Stand Base */}
              <rect x="42" y="124" width="12" height="18" rx="5" fill="#0284C7" />
              <rect x="66" y="124" width="12" height="18" rx="5" fill="#0284C7" />

              {/* Robot Shoes / Feet */}
              <ellipse cx="48" cy="144" rx="10" ry="5" fill="#6366F1" />
              <ellipse cx="72" cy="144" rx="10" ry="5" fill="#6366F1" />

              {/* Gradients */}
              <defs>
                <linearGradient id="headGradient" x1="25" y1="28" x2="95" y2="80" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38BDF8" />
                  <stop offset="0.5" stopColor="#0EA5E9" />
                  <stop offset="1" stopColor="#0284C7" />
                </linearGradient>
                <linearGradient id="bodyGradient" x1="32" y1="83" x2="88" y2="125" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0EA5E9" />
                  <stop offset="1" stopColor="#1E293B" />
                </linearGradient>
              </defs>
            </svg>

            {/* Bottom Platform Shadow */}
            <div className="w-20 h-3 bg-cyan-500/20 rounded-full blur-xs mt-[-6px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-84 sm:w-96 h-[470px] bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Header with Mascot Avatar */}
      <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1.5px] shadow-md shadow-cyan-500/20">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              {/* Mini Mascot Face */}
              <svg className="w-6 h-6" viewBox="0 0 64 64" fill="none">
                <rect x="12" y="14" width="40" height="32" rx="12" fill="#0EA5E9" />
                <rect x="18" y="20" width="28" height="18" rx="6" fill="#0F172A" />
                <circle cx="26" cy="28" r="3" fill="#38BDF8" />
                <circle cx="38" cy="28" r="3" fill="#38BDF8" />
                <path d="M29 33C30.5 34.5 33.5 34.5 35 33" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-slate-100">RideFlow Assistant</p>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-semibold px-1.5 py-0.2 rounded-full">
                AI Mascot
              </span>
            </div>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online • Gemini 3.5
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={resetChat}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 text-sm">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs shadow-md"
                  : "bg-slate-800/90 text-slate-200 border border-white/5 rounded-bl-xs shadow-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {msgs.length <= 1 && (
          <div className="pt-2 flex flex-wrap gap-1.5">
            {[
              "Tell me about RideFlow",
              "How does dynamic pricing work?",
              "What safety features exist?",
              "How do I book a ride?",
            ].map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(suggestion);
                  setTimeout(() => {
                    const btn = document.getElementById("copilot-send-btn");
                    if (btn) btn.click();
                  }, 50);
                }}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 rounded-full px-2.5 py-1 text-left transition hover:border-cyan-400 cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/90 text-slate-400 border border-white/5 px-3.5 py-2 rounded-2xl text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-white/10 bg-slate-800/40 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about rides, fares, or safety..."
          className="text-xs bg-slate-800/90 border-white/10 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500 h-9"
          disabled={loading}
        />
        <Button
          id="copilot-send-btn"
          size="sm"
          className="btn-gradient px-3 h-9 shrink-0 text-xs font-semibold cursor-pointer"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
};

export default CopilotChat;
