import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Car, Shield, Clock, Star, ChevronRight, ArrowRight,
  Zap, CreditCard, Navigation2, Users, Phone, Globe, Menu, X,
  MessageSquare, Bot, Wifi, WifiOff, Home, Briefcase, Plane,
  RotateCcw
} from "lucide-react";
import CopilotChat from "@/components/CopilotChat";

/* ── Luxury Sedan SVG (white, photorealistic side view on glowing platform) ── */
const LuxuryCar = () => (
  <div className="relative flex flex-col items-center justify-center w-full select-none">
    {/* Glowing platform */}
    <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[85%] h-8"
      style={{ background: "radial-gradient(ellipse, rgba(48,75,255,0.6) 0%, rgba(48,75,255,0.15) 50%, transparent 70%)", filter: "blur(8px)" }} />
    <div className="absolute bottom-[11%] left-1/2 -translate-x-1/2 w-[70%] h-[2px] rounded-full"
      style={{ background: "linear-gradient(90deg, transparent, rgba(100,150,255,0.8), transparent)" }} />

    {/* Car SVG */}
    <svg viewBox="0 0 680 280" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[520px] drop-shadow-2xl" style={{ filter: "drop-shadow(0 20px 40px rgba(48,75,255,0.3))" }} aria-label="RideFlow luxury sedan">
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F0F4FF" />
          <stop offset="100%" stopColor="#D0DCFF" />
        </linearGradient>
        <linearGradient id="bodyGrad2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E8EEFF" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C8D4F8" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFF" />
          <stop offset="100%" stopColor="#D8E4FF" />
        </linearGradient>
        <linearGradient id="glassGrad" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#A8C8FF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#6090E0" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="wheelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A3258" />
          <stop offset="100%" stopColor="#0D1230" />
        </linearGradient>
        <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8090C0" />
          <stop offset="100%" stopColor="#506090" />
        </linearGradient>
        <linearGradient id="blueAccent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#304BFF" />
          <stop offset="100%" stopColor="#6B7FFF" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="bodyShadow">
          <feDropShadow dx="0" dy="10" stdDeviation="15" floodColor="#304BFF" floodOpacity="0.2" />
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="340" cy="262" rx="285" ry="14" fill="#1a2a6c" opacity="0.35" />

      {/* Main body */}
      <path d="M60 205 Q62 165 110 150 L210 108 Q255 82 340 78 Q425 82 470 108 L570 150 Q618 165 620 205 L620 238 Q620 250 608 250 L72 250 Q60 250 60 238 Z"
        fill="url(#bodyGrad)" filter="url(#bodyShadow)" />

      {/* Body side highlight */}
      <path d="M62 200 Q64 168 108 155 L210 115 Q255 90 340 86 Q425 90 470 115 L572 155 Q615 168 618 200"
        fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />

      {/* Roof */}
      <path d="M198 152 Q230 88 340 80 Q450 88 482 152 Z" fill="url(#roofGrad)" />
      {/* Roof highlight */}
      <path d="M215 150 Q245 92 340 84 Q435 92 465 150" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" opacity="0.7" />

      {/* Windscreen */}
      <path d="M205 150 Q235 90 340 82 Q445 90 475 150 Z" fill="url(#glassGrad)" opacity="0.92" />
      {/* Windscreen glare */}
      <path d="M225 145 Q250 100 330 88 Q395 95 440 140" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

      {/* Rear left window */}
      <path d="M205 150 Q190 162 178 178 L248 178 L268 150 Z" fill="url(#glassGrad)" opacity="0.85" />
      {/* Front left window */}
      <path d="M268 150 L248 178 L390 178 L410 150 Z" fill="url(#glassGrad)" opacity="0.88" />
      {/* Windshield area */}
      <path d="M410 150 L390 178 L450 178 Q472 162 475 150 Z" fill="url(#glassGrad)" opacity="0.85" />

      {/* Window frames */}
      <path d="M205 150 Q190 162 178 178 L248 178 L268 150 Z" fill="none" stroke="#9EB8F0" strokeWidth="1" opacity="0.5" />
      <path d="M268 150 L248 178 L390 178 L410 150 Z" fill="none" stroke="#9EB8F0" strokeWidth="1" opacity="0.5" />

      {/* Door lines */}
      <line x1="268" y1="150" x2="272" y2="248" stroke="#C0D0F0" strokeWidth="1.5" opacity="0.6" />
      <line x1="410" y1="150" x2="412" y2="248" stroke="#C0D0F0" strokeWidth="1.5" opacity="0.6" />

      {/* Blue accent stripe */}
      <path d="M75 210 L605 210" stroke="url(#blueAccent)" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      {/* Blue underbody trim */}
      <path d="M75 230 Q75 245 90 248 L590 248 Q605 245 605 230" stroke="url(#blueAccent)" strokeWidth="2" fill="none" opacity="0.4" />

      {/* Headlights (right side) */}
      <ellipse cx="596" cy="194" rx="18" ry="10" fill="#FFF9D0" opacity="0.9" />
      <ellipse cx="596" cy="194" rx="13" ry="7" fill="#FFE840" opacity="0.85" />
      <path d="M598 185 L625 178 L622 200 Z" fill="#FFF9D0" opacity="0.5" />
      {/* DRL */}
      <path d="M578 200 L598 200" stroke="url(#blueAccent)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />

      {/* Taillights (left side) */}
      <ellipse cx="84" cy="194" rx="18" ry="10" fill="#FF4040" opacity="0.8" />
      <ellipse cx="84" cy="194" rx="12" ry="7" fill="#FF6060" opacity="0.7" />
      {/* Taillight stripe */}
      <path d="M82 188 L82 200" stroke="#FF2020" strokeWidth="4" strokeLinecap="round" opacity="0.9" />

      {/* Front grille */}
      <path d="M580 215 Q590 218 598 222 L598 235 Q590 238 580 238 Z" fill="#1A2040" opacity="0.8" />
      <path d="M578 218 L596 225" stroke="url(#blueAccent)" strokeWidth="2" opacity="0.6" />

      {/* Logo emblem */}
      <circle cx="340" cy="252" r="6" fill="url(#blueAccent)" opacity="0.8" />

      {/* Rear wheel */}
      <circle cx="175" cy="248" r="46" fill="url(#wheelGrad)" />
      <circle cx="175" cy="248" r="34" fill="#1A2040" />
      <circle cx="175" cy="248" r="22" fill="#232D58" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={175 + 22 * Math.cos(a * Math.PI / 180)}
          y1={248 + 22 * Math.sin(a * Math.PI / 180)}
          x2={175 + 33 * Math.cos(a * Math.PI / 180)}
          y2={248 + 33 * Math.sin(a * Math.PI / 180)}
          stroke="url(#rimGrad)" strokeWidth="4.5" strokeLinecap="round" />
      ))}
      <circle cx="175" cy="248" r="7" fill="url(#rimGrad)" />
      <circle cx="175" cy="248" r="3" fill="#304BFF" />

      {/* Front wheel */}
      <circle cx="490" cy="248" r="46" fill="url(#wheelGrad)" />
      <circle cx="490" cy="248" r="34" fill="#1A2040" />
      <circle cx="490" cy="248" r="22" fill="#232D58" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={490 + 22 * Math.cos(a * Math.PI / 180)}
          y1={248 + 22 * Math.sin(a * Math.PI / 180)}
          x2={490 + 33 * Math.cos(a * Math.PI / 180)}
          y2={248 + 33 * Math.sin(a * Math.PI / 180)}
          stroke="url(#rimGrad)" strokeWidth="4.5" strokeLinecap="round" />
      ))}
      <circle cx="490" cy="248" r="7" fill="url(#rimGrad)" />
      <circle cx="490" cy="248" r="3" fill="#304BFF" />

      {/* Blue accent LED bars */}
      <rect x="82" y="202" width="28" height="5" rx="2.5" fill="url(#blueAccent)" opacity="0.9" filter="url(#glow)" />
      <rect x="570" y="202" width="28" height="5" rx="2.5" fill="url(#blueAccent)" opacity="0.9" filter="url(#glow)" />

      {/* Side mirror */}
      <path d="M472 162 L490 158 L490 170 L472 175 Z" fill="url(#bodyGrad)" stroke="#C0D0F0" strokeWidth="0.5" />
    </svg>

    {/* 360° badge */}
    <div className="absolute top-2 right-[8%] flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg">
      <RotateCcw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
      360° View
    </div>
  </div>
);

/* ── Vehicle category data ── */
const vehicleTypes = [
  { id: "auto",    label: "Auto",    emoji: "🛺", color: "#F59E0B" },
  { id: "sedan",   label: "Sedan",   emoji: "🚗", color: "#304BFF" },
  { id: "suv",     label: "SUV",     emoji: "🚙", color: "#10B981" },
  { id: "luxury",  label: "Luxury",  emoji: "🏎️", color: "#8B5CF6" },
];

/* ── Stats bar ── */
const stats = [
  { value: "2M+",  label: "Happy Riders" },
  { value: "50K+", label: "Active Drivers" },
  { value: "20+",  label: "Cities" },
  { value: "4.8★", label: "User Rating" },
];

/* ── Nav links ── */
const NAV_LINKS = ["Home","Services","How It Works","About","Contact"];

/* ── Features ── */
const features = [
  { icon: Navigation2, title: "Real-Time Tracking", desc: "Live GPS updates every second with precise route mapping.", color: "#304BFF" },
  { icon: CreditCard, title: "Multiple Payments", desc: "UPI, card, wallet or cash — pay how you prefer.", color: "#10B981" },
  { icon: Bot, title: "AI Ride Assistant", desc: "Book, modify or get help instantly with Gemini AI.", color: "#7C3AED" },
  { icon: Shield, title: "Safe & Secure", desc: "OTP-verified pickups and background-checked drivers.", color: "#EF4444" },
  { icon: Car, title: "Comfortable Rides", desc: "Curated fleet from economy autos to premium sedans.", color: "#0EA5E9" },
  { icon: Zap, title: "Fast & Reliable", desc: "Match with nearby drivers in under 30 seconds.", color: "#F59E0B" },
];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("sedan");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<[number,number]|null>(null);
  const [selectedDest, setSelectedDest] = useState<[number,number]|null>(null);
  const [routeKm, setRouteKm] = useState(0);
  const [estFare, setEstFare] = useState<number|null>(null);
  const [estETA, setEstETA] = useState<number|null>(null);
  const [requesting, setRequesting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<number|null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<"rider"|"driver">("rider");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchDrivers = async () => {
      try {
        const r = await fetch("/api/drivers/available");
        if (!r.ok) return;
        const j = await r.json();
        if (mounted) setAvailableDrivers(j.available ?? 0);
      } catch { }
    };
    fetchDrivers();
    const id = setInterval(fetchDrivers, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!selectedPickup || !selectedDest || !MAPBOX_TOKEN) return;
    const calc = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${selectedPickup[0]},${selectedPickup[1]};${selectedDest[0]},${selectedDest[1]}?overview=false&access_token=${MAPBOX_TOKEN}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j.routes?.[0]) {
          const km = Math.round((j.routes[0].distance / 1000) * 10) / 10;
          const mins = Math.max(1, Math.round(j.routes[0].duration / 60));
          setRouteKm(km);
          setEstETA(mins);
          setEstFare(Math.max(5000, Math.round(km * 10 * 100)));
        }
      } catch { }
    };
    calc();
  }, [selectedPickup, selectedDest]);

  const onSuggest = async (q: string, which: "pickup"|"dest") => {
    if (!q || !MAPBOX_TOKEN) return;
    try {
      const r = await fetch(`/api/mapbox/suggest?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const items = j.results || [];
      if (which === "pickup") setPickupSuggestions(items);
      else setDestSuggestions(items);
    } catch { }
  };

  const selectSug = (item: any, which: "pickup"|"dest") => {
    const coords = item.center as [number,number];
    if (which === "pickup") {
      setSelectedPickup(coords); setPickup(item.place_name); setPickupSuggestions([]);
    } else {
      setSelectedDest(coords); setDestination(item.place_name); setDestSuggestions([]);
    }
  };

  const handleSwap = () => {
    setPickup(destination); setDestination(pickup);
    setSelectedPickup(selectedDest); setSelectedDest(selectedPickup);
    setPickupSuggestions([]); setDestSuggestions([]);
  };

  const handleBook = async () => {
    if (!selectedPickup || !selectedDest) { alert("Please select pickup and destination"); return; }
    const token = localStorage.getItem("token");
    if (!token) { navigate("/auth"); return; }
    setRequesting(true);
    try {
      navigate("/rider");
    } catch { alert("Failed to request ride"); }
    finally { setRequesting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#11152F]">

      {/* ═══════ NAV BAR ═══════ */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-xl shadow-md border-b border-[#E4EAF6]" : "bg-white/80 backdrop-blur-sm"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm bg-[#304BFF]">
              R
            </div>
            <span className="text-xl font-black tracking-tight text-[#11152F]">
              Ride<span className="text-[#304BFF]">Flow</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((item, i) => (
              <a key={item}
                href={i === 0 ? "#home" : `#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  i === 0 ? "text-[#304BFF] font-semibold" : "text-[#536184] hover:text-[#304BFF] hover:bg-[#EAEFFF]"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate("/auth")}
              className="px-4 py-2 text-sm font-semibold text-[#304BFF] border border-[#304BFF]/25 hover:bg-[#EAEFFF] rounded-xl transition-all duration-150">
              Sign In
            </button>
            <button onClick={() => navigate("/auth")}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #304BFF, #6B7FFF)" }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-[#536184] hover:bg-[#EAEFFF] transition"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E4EAF6] px-4 py-4 flex flex-col gap-2">
            {NAV_LINKS.map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#536184] hover:text-[#304BFF] hover:bg-[#EAEFFF]"
                onClick={() => setMobileMenuOpen(false)}>{item}</a>
            ))}
            <div className="border-t border-[#E4EAF6] pt-2 flex flex-col gap-2 mt-1">
              <button onClick={() => navigate("/auth")} className="w-full px-4 py-2.5 text-sm font-semibold text-[#304BFF] border border-[#304BFF]/30 rounded-xl hover:bg-[#EAEFFF]">Sign In</button>
              <button onClick={() => navigate("/auth")} className="w-full flex justify-center items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: "linear-gradient(135deg, #304BFF, #6B7FFF)" }}>Get Started <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════ HERO SECTION ═══════ */}
      <section id="home" className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0B1426 0%, #0D1B3E 40%, #0B1A35 70%, #091428 100%)" }}>

        {/* City skyline silhouette */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Skyline */}
          <svg viewBox="0 0 1440 300" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full opacity-25" preserveAspectRatio="xMidYMax slice">
            <path d="M0 300 L0 200 L20 200 L20 160 L40 160 L40 120 L60 120 L60 160 L80 160 L80 100 L100 100 L100 140 L120 140 L120 80 L140 80 L140 130 L160 130 L160 90 L180 90 L180 130 L200 130 L200 60 L220 60 L220 100 L240 100 L240 70 L260 70 L260 110 L280 110 L280 80 L300 80 L300 120 L320 120 L320 90 L340 90 L340 130 L360 130 L360 100 L380 100 L380 50 L400 50 L400 90 L420 90 L420 70 L440 70 L440 110 L460 110 L460 85 L480 85 L480 125 L500 125 L500 95 L520 95 L520 135 L540 135 L540 105 L560 105 L560 75 L580 75 L580 115 L600 115 L600 80 L620 80 L620 120 L640 120 L640 90 L660 90 L660 130 L680 130 L680 100 L700 100 L700 60 L720 60 L720 100 L740 100 L740 70 L760 70 L760 110 L780 110 L780 140 L800 140 L800 110 L820 110 L820 80 L840 80 L840 120 L860 120 L860 90 L880 90 L880 130 L900 130 L900 100 L920 100 L920 140 L940 140 L940 110 L960 110 L960 80 L980 80 L980 120 L1000 120 L1000 90 L1020 90 L1020 130 L1040 130 L1040 100 L1060 100 L1060 140 L1080 140 L1080 110 L1100 110 L1100 80 L1120 80 L1120 120 L1140 120 L1140 90 L1160 90 L1160 130 L1180 130 L1180 160 L1200 160 L1200 130 L1220 130 L1220 100 L1240 100 L1240 140 L1260 140 L1260 160 L1280 160 L1280 200 L1300 200 L1300 160 L1320 160 L1320 200 L1340 200 L1340 180 L1360 180 L1360 210 L1380 210 L1380 200 L1400 200 L1400 220 L1440 220 L1440 300 Z"
              fill="#1A2A5E" />
            {/* Windows */}
            {[120,140,220,260,380,400,420,560,580,700,720,820,860,960,1000,1100,1140,1200].map((x, i) => (
              <rect key={i} x={x + 8} y={Math.random() * 40 + 70} width="8" height="10" fill="#304BFF" opacity="0.3" />
            ))}
          </svg>

          {/* Atmospheric glow from bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-64"
            style={{ background: "linear-gradient(to top, rgba(48,75,255,0.08) 0%, transparent 100%)" }} />

          {/* Star field */}
          <div className="absolute inset-0">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  top: `${Math.random() * 60}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.6 + 0.1,
                }} />
            ))}
          </div>

          {/* Left gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(11,20,38,0.6) 0%, transparent 40%, transparent 60%, rgba(11,20,38,0.5) 100%)" }} />
        </div>

        {/* Main hero content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-12 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center min-h-[82vh]">

            {/* ── LEFT: Hero copy ── */}
            <div className="lg:col-span-4 space-y-7 z-10">
              <div className="inline-flex items-center gap-2 bg-[#304BFF]/20 border border-[#304BFF]/40 text-[#8AABFF] text-xs font-semibold px-3.5 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-[#6B9FFF] rounded-full animate-pulse" />
                Next-Gen Ride Hailing Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-6xl font-black leading-[1.1] tracking-tight text-white">
                Move Smarter<br />With{" "}
                <span style={{ background: "linear-gradient(135deg, #304BFF, #6B9FFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  RideFlow
                </span>
              </h1>

              <p className="text-base text-white/65 leading-relaxed max-w-md">
                Safe, fast, and affordable rides with real-time tracking, AI assistance, and seamless payments across all your journeys.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate("/auth")}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #304BFF, #5B7FFF)" }}>
                  Book a Ride <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate("/auth")}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white/80 border border-white/25 rounded-xl hover:bg-white/10 hover:text-white transition-all duration-150">
                  Become a Driver
                </button>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/10">
                {stats.map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-xl sm:text-2xl font-black text-white">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-white/50 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CENTER: Car ── */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center py-2 z-10">
              {/* Platform glow */}
              <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[70%] h-24 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(48,75,255,0.35) 0%, transparent 70%)", filter: "blur(20px)" }} />

              <div className="w-full max-w-[520px] mx-auto -mb-4">
                <LuxuryCar />
              </div>

              {/* Vehicle selector pills */}
              <div className="flex items-center gap-2 mt-6 p-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-lg">
                {vehicleTypes.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 text-xs font-medium ${
                      selectedVehicle === v.id
                        ? "bg-[#304BFF] text-white shadow-sm"
                        : "text-white/60 hover:bg-white/10 hover:text-white/90"
                    }`}
                  >
                    <span className="text-base">{v.emoji}</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Booking card + AI card ── */}
            <div className="lg:col-span-3 flex flex-col gap-4 z-10">

              {/* Booking card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, #304BFF, #6B7FFF)" }}>
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#11152F] text-sm">Book a Ride</h3>
                    <p className="text-[10px] text-[#536184]">
                      {availableDrivers != null && availableDrivers > 0
                        ? `${availableDrivers} drivers nearby`
                        : "Finding drivers..."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Pickup */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                      <input
                        value={pickup}
                        onChange={e => { setPickup(e.target.value); onSuggest(e.target.value, "pickup"); }}
                        placeholder="Pickup location"
                        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                      />
                    </div>
                    {pickupSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E4EAF6] rounded-xl shadow-xl z-30 overflow-hidden max-h-36 overflow-y-auto">
                        {pickupSuggestions.slice(0,4).map((s:any) => (
                          <button key={s.id} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#11152F] hover:bg-[#F5F8FF] text-left" onClick={() => selectSug(s,"pickup")}>
                            <MapPin className="w-3 h-3 text-[#536184] shrink-0" />
                            <span className="truncate">{s.place_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Swap */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-dashed border-[#E4EAF6]" />
                    <button onClick={handleSwap} className="p-1.5 rounded-lg bg-white border border-[#E4EAF6] hover:bg-[#EAEFFF] transition shadow-sm">
                      <svg className="w-3.5 h-3.5 text-[#536184]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                    <div className="flex-1 border-t border-dashed border-[#E4EAF6]" />
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
                      <input
                        value={destination}
                        onChange={e => { setDestination(e.target.value); onSuggest(e.target.value,"dest"); }}
                        placeholder="Where are you going?"
                        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                      />
                    </div>
                    {destSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E4EAF6] rounded-xl shadow-xl z-30 overflow-hidden max-h-36 overflow-y-auto">
                        {destSuggestions.slice(0,4).map((s:any) => (
                          <button key={s.id} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#11152F] hover:bg-[#F5F8FF] text-left" onClick={() => selectSug(s,"dest")}>
                            <MapPin className="w-3 h-3 text-[#536184] shrink-0" />
                            <span className="truncate">{s.place_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick chips */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: "Home", icon: "🏠" },
                      { label: "Work", icon: "💼" },
                      { label: "Airport", icon: "✈️" },
                      { label: "Metro Station", icon: "🚇" },
                    ].map(q => (
                      <button key={q.label} onClick={() => { setDestination(q.label); onSuggest(q.label,"dest"); }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAEFFF] text-[#304BFF] hover:bg-[#304BFF] hover:text-white transition-all duration-150">
                        {q.icon} {q.label}
                      </button>
                    ))}
                  </div>

                  {/* Fare/ETA */}
                  {(estFare || estETA) && (
                    <div className="flex justify-between items-center text-xs bg-[#F5F8FF] rounded-xl px-3 py-2 border border-[#E4EAF6]">
                      <span className="text-[#536184]">Est. Fare</span>
                      <span className="font-bold text-[#304BFF]">₹{estFare ? (estFare/100).toFixed(0) : "—"}</span>
                      <span className="text-[#536184]">ETA</span>
                      <span className="font-bold text-[#304BFF]">{estETA ? `${estETA} min` : "—"}</span>
                    </div>
                  )}

                  {/* CTA */}
                  <button
                    onClick={handleBook}
                    disabled={!selectedPickup || !selectedDest || requesting}
                    className="w-full py-3 text-sm font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #304BFF, #5B7FFF)" }}
                  >
                    {requesting
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Finding Ride...</>
                      : "Find Rides →"}
                  </button>
                </div>
              </div>

              {/* AI Assistant card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-white/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #304BFF)" }}>
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#11152F]">AI Ride Assistant</span>
                      <div className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EDFBF4] text-[#16B86A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16B86A] animate-pulse" />
                        Online
                      </div>
                    </div>
                    <p className="text-[11px] text-[#536184] mt-1 leading-relaxed">
                      Book, cancel or modify rides using natural language.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Book a ride", "Cancel my ride", "Track my ride"].map(q => (
                        <button key={q} onClick={() => document.getElementById("open-copilot")?.click()}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-[#E4EAF6] text-[#536184] hover:border-[#304BFF] hover:text-[#304BFF] transition-all duration-150">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════ FEATURES SECTION ═══════ */}
      <section id="services" className="py-20 bg-white border-t border-[#E4EAF6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#EAEFFF] border border-[#304BFF]/20 text-[#304BFF] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#304BFF] rounded-full" />
              Why RideFlow
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#11152F] mb-4">Built for Modern Mobility</h2>
            <p className="text-[#536184] max-w-2xl mx-auto">
              Experience the next generation of ride-sharing with cutting-edge technology and a customer-first design.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={f.title} className="bg-white border border-[#E4EAF6] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${f.color}15`, color: f.color }}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#11152F] mb-2">{f.title}</h3>
                <p className="text-sm text-[#536184]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="py-20 bg-[#F5F8FF] border-t border-[#E4EAF6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#EAEFFF] border border-[#304BFF]/20 text-[#304BFF] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 bg-[#304BFF] rounded-full" />
              Simple & Intuitive
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#11152F] mb-4">How It Works</h2>
          </div>

          <div className="flex justify-center mb-10">
            <div className="flex p-1 bg-white border border-[#E4EAF6] rounded-2xl gap-1 shadow-sm">
              <button className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeFeatureTab === "rider" ? "bg-[#304BFF] text-white shadow-sm" : "text-[#536184] hover:text-[#304BFF]"}`}
                onClick={() => setActiveFeatureTab("rider")}>For Riders</button>
              <button className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeFeatureTab === "driver" ? "bg-[#304BFF] text-white shadow-sm" : "text-[#536184] hover:text-[#304BFF]"}`}
                onClick={() => setActiveFeatureTab("driver")}>For Drivers</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(activeFeatureTab === "rider" ? [
              { step: "01", title: "Set Your Location", desc: "Enter your pickup and destination with smart autocomplete.", icon: MapPin },
              { step: "02", title: "Choose a Ride", desc: "Pick from Economy, Standard or Premium options with live fares.", icon: Car },
              { step: "03", title: "Get Matched", desc: "A verified driver accepts your ride in under 30 seconds.", icon: Users },
              { step: "04", title: "Arrive Safely", desc: "OTP-verified boarding, live tracking and digital receipt.", icon: Shield },
            ] : [
              { step: "01", title: "Sign Up to Drive", desc: "Complete your profile, add vehicle details and get verified.", icon: Users },
              { step: "02", title: "Go Online", desc: "Toggle availability to start receiving ride requests nearby.", icon: Wifi },
              { step: "03", title: "Accept Requests", desc: "Review fare, distance and pickup before accepting a ride.", icon: Phone },
              { step: "04", title: "Earn & Grow", desc: "Weekly payouts, performance bonuses and flexible hours.", icon: Star },
            ]).map(s => (
              <div key={s.step} className="bg-white border border-[#E4EAF6] rounded-2xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-200 shadow-sm">
                <div className="text-5xl font-black text-[#EAEFFF] absolute -top-1 -right-1 select-none">{s.step}</div>
                <div className="w-10 h-10 rounded-xl bg-[#EAEFFF] flex items-center justify-center mb-4 text-[#304BFF] group-hover:bg-[#304BFF] group-hover:text-white transition-all">
                  <s.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#11152F] text-sm mb-1.5">{s.title}</h3>
                <p className="text-xs text-[#536184]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA SECTION ═══════ */}
      <section id="about" className="py-20 bg-white border-t border-[#E4EAF6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-white border border-[#E4EAF6] rounded-3xl p-10 sm:p-16 relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(circle at 50% 0%, #EAEFFF, transparent 70%)" }} />
            <div className="inline-flex items-center gap-2 bg-[#EAEFFF] border border-[#304BFF]/20 text-[#304BFF] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-[#304BFF] rounded-full animate-pulse" />
              Ready to Ride?
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-[#11152F] mb-4">
              Join the <span style={{ background: "linear-gradient(135deg, #304BFF, #6B7FFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RideFlow</span> Community
            </h2>
            <p className="text-[#536184] mb-8 max-w-xl mx-auto">
              Experience smarter, safer and more convenient transportation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate("/auth")}
                className="flex items-center justify-center gap-1.5 px-8 py-3.5 text-base font-bold text-white rounded-xl hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, #304BFF, #5B7FFF)" }}>
                Get Started as Rider <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/auth")}
                className="flex items-center justify-center gap-1.5 px-8 py-3.5 text-base font-bold text-[#304BFF] border-2 border-[#304BFF]/30 rounded-xl hover:bg-[#EAEFFF] transition">
                Join as Driver <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="border-t border-[#E4EAF6] bg-[#11152F] text-white/70 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs bg-[#304BFF]">R</div>
              <span className="font-bold text-white">RideFlow</span>
            </div>
            <p className="text-sm">© 2025 RideFlow. All rights reserved.</p>
            <div className="flex gap-4 text-sm">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Copilot */}
      <CopilotChat />
    </div>
  );
};

export default Index;
