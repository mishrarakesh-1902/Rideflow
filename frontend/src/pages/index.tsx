import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Car, Shield, Clock, Star, ChevronRight, ArrowRight,
  Zap, CreditCard, Navigation2, Users, Phone, Globe, Menu, X,
  MessageSquare, Bot, Wifi, WifiOff
} from "lucide-react";
import CopilotChat from "@/components/CopilotChat";

/* ── Animated 3D-style car SVG (fallback + primary, no Three.js bundle on landing) ── */
const HeroCar = () => (
  <div className="relative flex items-center justify-center w-full h-full select-none">
    {/* Reflection platform */}
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[340px] h-8 rounded-full opacity-20"
      style={{ background: "radial-gradient(ellipse, #304BFF 0%, transparent 70%)" }}
    />
    {/* Car SVG — stylised modern sedan viewed from 3/4 front */}
    <div className="animate-float relative">
      <svg
        viewBox="0 0 640 320"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[420px] max-w-full drop-shadow-2xl"
        aria-label="RideFlow vehicle"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E8EEFF" />
            <stop offset="100%" stopColor="#C8D3F0" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#B8D4FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7EB0FF" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="wheelGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3D4A6B" />
            <stop offset="100%" stopColor="#1E2640" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#304BFF" />
            <stop offset="100%" stopColor="#6B7FFF" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#304BFF" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Body */}
        <ellipse cx="320" cy="290" rx="260" ry="16" fill="#304BFF" opacity="0.12" />
        <path
          d="M80 220 Q80 160 140 140 L220 100 Q270 70 320 68 Q380 68 420 100 L500 140 Q560 160 560 220 L560 255 Q560 268 546 268 L94 268 Q80 268 80 255 Z"
          fill="url(#bodyGrad)"
          filter="url(#shadow)"
        />
        {/* Roof */}
        <path
          d="M210 142 Q240 80 320 72 Q400 80 430 142 Z"
          fill="#E0E8FF"
          opacity="0.8"
        />
        {/* Windscreen */}
        <path
          d="M215 140 Q245 84 320 76 Q395 84 422 140 Z"
          fill="url(#glassGrad)"
          opacity="0.9"
        />
        {/* Side windows */}
        <path
          d="M215 140 Q195 155 185 168 L248 168 Z"
          fill="url(#glassGrad)"
          opacity="0.7"
        />
        <path
          d="M422 140 Q440 155 452 168 L392 168 Z"
          fill="url(#glassGrad)"
          opacity="0.7"
        />
        {/* Rear window */}
        <rect x="250" y="140" width="140" height="28" rx="4" fill="url(#glassGrad)" opacity="0.7" />

        {/* Blue accent stripe */}
        <path
          d="M100 218 L540 218"
          stroke="url(#accentGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Door lines */}
        <line x1="305" y1="168" x2="310" y2="258" stroke="#B0BFDF" strokeWidth="1.5" opacity="0.6" />

        {/* Headlights */}
        <ellipse cx="540" cy="208" rx="14" ry="8" fill="#FFF9C4" opacity="0.9" />
        <ellipse cx="540" cy="208" rx="10" ry="5" fill="#FFEE58" opacity="0.8" />
        {/* Taillights */}
        <ellipse cx="100" cy="208" rx="14" ry="8" fill="#FF5252" opacity="0.7" />

        {/* Wheels */}
        {/* Front wheel */}
        <circle cx="460" cy="265" r="42" fill="url(#wheelGrad)" />
        <circle cx="460" cy="265" r="30" fill="#2A3355" />
        <circle cx="460" cy="265" r="18" fill="#394570" />
        {[0,60,120,180,240,300].map(a => (
          <line
            key={a}
            x1={460 + 18 * Math.cos(a * Math.PI / 180)}
            y1={265 + 18 * Math.sin(a * Math.PI / 180)}
            x2={460 + 28 * Math.cos(a * Math.PI / 180)}
            y2={265 + 28 * Math.sin(a * Math.PI / 180)}
            stroke="#8896C0"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
        <circle cx="460" cy="265" r="6" fill="#8896C0" />
        {/* Rear wheel */}
        <circle cx="178" cy="265" r="42" fill="url(#wheelGrad)" />
        <circle cx="178" cy="265" r="30" fill="#2A3355" />
        <circle cx="178" cy="265" r="18" fill="#394570" />
        {[0,60,120,180,240,300].map(a => (
          <line
            key={a}
            x1={178 + 18 * Math.cos(a * Math.PI / 180)}
            y1={265 + 18 * Math.sin(a * Math.PI / 180)}
            x2={178 + 28 * Math.cos(a * Math.PI / 180)}
            y2={265 + 28 * Math.sin(a * Math.PI / 180)}
            stroke="#8896C0"
            strokeWidth="4"
            strokeLinecap="round"
          />
        ))}
        <circle cx="178" cy="265" r="6" fill="#8896C0" />

        {/* Blue accent light bar */}
        <rect x="100" y="198" width="30" height="6" rx="3" fill="#304BFF" opacity="0.9" />
        <rect x="510" y="198" width="30" height="6" rx="3" fill="#304BFF" opacity="0.9" />
      </svg>
      {/* 360° badge */}
      <div className="absolute top-2 right-4 flex items-center gap-1 bg-white/90 border border-[#E4EAF6] rounded-full px-3 py-1 text-xs font-semibold text-[#304BFF] shadow-sm">
        <svg className="w-3 h-3 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-9-9" />
          <path d="M21 3v9h-9" />
        </svg>
        360° View
      </div>
    </div>
  </div>
);

/* ── Vehicle category pills ── */
const vehicleTypes = [
  { id: "auto",    label: "Auto",    color: "#FF9800" },
  { id: "sedan",   label: "Sedan",   color: "#304BFF" },
  { id: "suv",     label: "SUV",     color: "#4CAF50" },
  { id: "luxury",  label: "Luxury",  color: "#9C27B0" },
];

/* ── Feature cards ── */
const features = [
  { icon: Navigation2, title: "Real-Time Tracking",    desc: "Live GPS updates every second with precise route mapping.", color: "#304BFF" },
  { icon: CreditCard,  title: "Multiple Payments",     desc: "UPI, card, wallet or cash — pay how you prefer.",          color: "#16B86A" },
  { icon: Bot,         title: "AI Ride Assistant",     desc: "Book, modify or get help instantly with Gemini AI.",       color: "#7C3AED" },
  { icon: Shield,      title: "Safe & Secure",         desc: "OTP-verified pickups and background-checked drivers.",     color: "#F04452" },
  { icon: Car,         title: "Comfortable Rides",     desc: "Curated fleet from economy autos to premium sedans.",      color: "#0EA5E9" },
  { icon: Zap,         title: "Fast & Reliable",       desc: "Match with nearby drivers in under 30 seconds.",           color: "#F59E0B" },
];

/* ── Statistics ── */
const stats = [
  { value: "2M+",  label: "Happy Riders" },
  { value: "50K+", label: "Active Drivers" },
  { value: "20+",  label: "Cities" },
  { value: "4.8★", label: "User Rating" },
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
  const [selectedDest, setSelectedDest]   = useState<[number,number]|null>(null);
  const [routeKm, setRouteKm] = useState(0);
  const [estFare, setEstFare] = useState<number|null>(null);
  const [estETA,  setEstETA]  = useState<number|null>(null);
  const [requesting, setRequesting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<number|null>(null);
  const [rideType, setRideType] = useState("standard");
  const [activeFeatureTab, setActiveFeatureTab] = useState<"rider"|"driver">("rider");
  const [scrolled, setScrolled] = useState(false);
  const [aiOnline, setAiOnline] = useState(true);

  /* Nav scroll effect */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Available drivers */
  useEffect(() => {
    let mounted = true;
    const fetchDrivers = async () => {
      try {
        const r = await fetch("/api/drivers/available");
        if (!r.ok) return;
        const j = await r.json();
        if (mounted) setAvailableDrivers(j.available ?? 0);
      } catch { /* ignore */ }
    };
    fetchDrivers();
    const id = setInterval(fetchDrivers, 15000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  /* Route estimate */
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
      } catch { /* ignore */ }
    };
    calc();
  }, [selectedPickup, selectedDest]);

  /* Ride options */
  const rideOptions = useMemo(() => {
    const d = routeKm > 0 ? routeKm : 5;
    const econ  = Math.max(5000, Math.round(d * 10 * 0.8 * 100));
    const std   = Math.max(5000, Math.round(d * 10 * 1.0 * 100));
    const prem  = Math.max(7500, Math.round(d * 10 * 1.5 * 100));
    return [
      { id: "economy",  name: "Economy",  price: econ, display: `₹${(econ/100).toFixed(0)}`, time: "5 min" },
      { id: "standard", name: "Standard", price: std,  display: `₹${(std/100).toFixed(0)}`,  time: "3 min" },
      { id: "premium",  name: "Premium",  price: prem, display: `₹${(prem/100).toFixed(0)}`, time: "2 min" },
    ];
  }, [routeKm]);

  /* Suggest handler */
  const onSuggest = async (q: string, which: "pickup"|"dest") => {
    if (!q || !MAPBOX_TOKEN) return;
    try {
      const r = await fetch(`/api/mapbox/suggest?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      const items = j.results || [];
      if (which === "pickup") setPickupSuggestions(items);
      else setDestSuggestions(items);
    } catch { /* ignore */ }
  };

  const selectSug = (item: any, which: "pickup"|"dest") => {
    const coords = item.center as [number,number];
    if (which === "pickup") {
      setSelectedPickup(coords); setPickup(item.place_name); setPickupSuggestions([]);
    } else {
      setSelectedDest(coords); setDestination(item.place_name); setDestSuggestions([]);
    }
  };

  /* Book ride */
  const handleBook = async () => {
    if (!selectedPickup || !selectedDest) { alert("Please select pickup and destination"); return; }
    const token = localStorage.getItem("token");
    if (!token) { navigate("/auth"); return; }
    setRequesting(true);
    try {
      const opt = rideOptions.find(r => r.id === rideType);
      const resp = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickup: { address: pickup, location: { type: "Point", coordinates: selectedPickup } },
          destination: { address: destination, location: { type: "Point", coordinates: selectedDest } },
          rideType, fare: opt?.price ?? estFare, paymentMethod: "cash",
        }),
      });
      if (!resp.ok) { const e = await resp.json(); alert(e.message || "Request failed"); return; }
      navigate("/rider");
    } catch { alert("Failed to request ride"); }
    finally { setRequesting(false); }
  };

  /* Swap pickup ↔ destination */
  const handleSwap = () => {
    setPickup(destination);
    setDestination(pickup);
    setSelectedPickup(selectedDest);
    setSelectedDest(selectedPickup);
    setPickupSuggestions([]);
    setDestSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#11152F]">

      {/* ═══════════════════════════════════════
          NAV BAR
      ═══════════════════════════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-xl border-b border-[#E4EAF6] shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: "var(--gradient-primary)" }}>
              R
            </div>
            <span className="text-xl font-black tracking-tight text-[#11152F]">
              Ride<span className="text-gradient">Flow</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {["Home","Services","How It Works","About"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g,"-")}`}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#536184] hover:text-[#304BFF] hover:bg-[#EAEFFF] transition-all duration-150"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 text-sm font-semibold text-[#304BFF] hover:bg-[#EAEFFF] rounded-xl transition-all duration-150"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="btn-primary gap-1.5"
            >
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
          <div className="md:hidden bg-white border-b border-[#E4EAF6] px-4 py-4 flex flex-col gap-2 animate-fade-up">
            {["Home","Services","How It Works","About"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g,"-")}`}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-[#536184] hover:text-[#304BFF] hover:bg-[#EAEFFF]"
                onClick={() => setMobileMenuOpen(false)}
              >{item}</a>
            ))}
            <div className="border-t border-[#E4EAF6] pt-2 flex flex-col gap-2 mt-1">
              <button onClick={() => navigate("/auth")} className="w-full px-4 py-2.5 text-sm font-semibold text-[#304BFF] border border-[#304BFF]/30 rounded-xl hover:bg-[#EAEFFF]">Sign In</button>
              <button onClick={() => navigate("/auth")} className="btn-primary w-full">Get Started</button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════ */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(135deg, #EEF2FF 0%, #F5F8FF 40%, #F0F7FF 100%)"
        }} />
        {/* Decorative blobs */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, #C7D7FF 0%, transparent 70%)", transform: "translate(30%, -20%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #DBEAFE 0%, transparent 70%)", transform: "translate(-30%, 20%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-16 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 items-center min-h-[80vh]">

            {/* ── Left: Hero copy ── */}
            <div className="lg:col-span-5 space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 bg-[#EAEFFF] border border-[#304BFF]/20 text-[#304BFF] text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-[#304BFF] rounded-full animate-pulse" />
                Next-Gen Ride Hailing Platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-[#11152F]">
                Move Smarter<br />With{" "}
                <span className="text-gradient">RideFlow</span>
              </h1>

              <p className="text-base sm:text-lg text-[#536184] leading-relaxed max-w-md">
                Safe, fast, and affordable rides with real-time tracking, AI assistance, and seamless payments across all your journeys.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate("/auth")} className="btn-primary px-6 py-3 text-base">
                  Book a Ride <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate("/auth")} className="btn-ghost px-6 py-3 text-base">
                  Become a Driver
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 pt-4">
                {stats.map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-xl sm:text-2xl font-black text-[#304BFF]">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-[#536184] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Center: Car visual ── */}
            <div className="lg:col-span-4 relative flex flex-col items-center justify-center py-4">
              <div className="w-full max-w-md mx-auto">
                <HeroCar />
              </div>
              {/* Vehicle selector */}
              <div className="flex items-center gap-2 mt-4 p-1.5 bg-white/80 backdrop-blur-sm border border-[#E4EAF6] rounded-2xl shadow-sm">
                {vehicleTypes.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 text-xs font-medium ${
                      selectedVehicle === v.id
                        ? "bg-[#EAEFFF] text-[#304BFF] shadow-sm"
                        : "text-[#536184] hover:bg-[#F5F8FF]"
                    }`}
                  >
                    <Car className="w-4 h-4" style={{ color: selectedVehicle === v.id ? v.color : undefined }} />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Right: Booking card + AI card ── */}
            <div className="lg:col-span-3 flex flex-col gap-4 animate-slide-right">

              {/* Booking card */}
              <div className="hero-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                    <Car className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-[#11152F] text-sm">Book a Ride</h3>
                </div>

                <div className="space-y-3">
                  {/* Pickup */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/20 transition-all">
                      <div className="w-2 h-2 rounded-full bg-[#16B86A] shrink-0" />
                      <input
                        value={pickup}
                        onChange={e => { setPickup(e.target.value); onSuggest(e.target.value, "pickup"); }}
                        placeholder="Pickup location"
                        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                      />
                    </div>
                    {pickupSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E4EAF6] rounded-xl shadow-lg z-20 overflow-hidden max-h-36 overflow-y-auto">
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
                    <button onClick={handleSwap} className="p-1.5 rounded-lg bg-[#F5F8FF] border border-[#E4EAF6] hover:bg-[#EAEFFF] transition">
                      <svg className="w-3.5 h-3.5 text-[#536184]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </button>
                    <div className="flex-1 border-t border-dashed border-[#E4EAF6]" />
                  </div>

                  {/* Destination */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/20 transition-all">
                      <div className="w-2 h-2 rounded-full bg-[#F04452] shrink-0" />
                      <input
                        value={destination}
                        onChange={e => { setDestination(e.target.value); onSuggest(e.target.value,"dest"); }}
                        placeholder="Drop-off location"
                        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                      />
                    </div>
                    {destSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E4EAF6] rounded-xl shadow-lg z-20 overflow-hidden max-h-36 overflow-y-auto">
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
                    {["Home","Work","Airport","Metro Station"].map(q => (
                      <button key={q} onClick={() => { setDestination(q); onSuggest(q,"dest"); }}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#EAEFFF] text-[#304BFF] hover:bg-[#304BFF] hover:text-white transition-all duration-150">
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Ride type */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {rideOptions.map(o => (
                      <button
                        key={o.id}
                        onClick={() => { setRideType(o.id); setEstFare(o.price); }}
                        className={`p-2 rounded-xl text-center transition-all duration-150 border ${
                          rideType === o.id
                            ? "border-[#304BFF] bg-[#EAEFFF]"
                            : "border-[#E4EAF6] bg-white hover:border-[#304BFF]/40"
                        }`}
                      >
                        <div className={`text-[10px] font-bold ${rideType === o.id ? "text-[#304BFF]" : "text-[#11152F]"}`}>{o.name}</div>
                        <div className="text-[10px] text-[#536184] mt-0.5">{o.display}</div>
                      </button>
                    ))}
                  </div>

                  {/* Fare / ETA row */}
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
                    className="btn-primary w-full py-3 text-sm"
                  >
                    {requesting ? (
                      <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Finding Ride...</span>
                    ) : "Find Rides →"}
                  </button>

                  <p className="text-[10px] text-center text-[#A0AABF]">
                    {availableDrivers != null && availableDrivers > 0
                      ? `${availableDrivers} drivers nearby · Quick match`
                      : "Searching for drivers..."}
                  </p>
                </div>
              </div>

              {/* AI Assistant preview card */}
              <div className="hero-card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#7C3AED,#304BFF)" }}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#11152F]">AI Ride Assistant</span>
                      <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${aiOnline ? "bg-[#EDFBF4] text-[#16B86A]" : "bg-[#F1F5F9] text-[#536184]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${aiOnline ? "bg-[#16B86A] animate-pulse" : "bg-[#94A3B8]"}`} />
                        {aiOnline ? "Online" : "Offline"}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#536184] mt-1">
                      Book, cancel or modify rides using natural language.
                    </p>
                    <button
                      onClick={() => document.getElementById("open-copilot")?.click()}
                      className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#304BFF] hover:underline"
                    >
                      <MessageSquare className="w-3 h-3" /> Ask anything →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES SECTION
      ═══════════════════════════════════════ */}
      <section id="services" className="py-20 bg-white border-t border-[#E4EAF6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-eyebrow mb-3">Why RideFlow</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#11152F] mb-4">Built for Modern Mobility</h2>
            <p className="text-[#536184] max-w-2xl mx-auto">
              Experience the next generation of ride-sharing with cutting-edge technology and a customer-first design.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="rf-card-hover p-6 group"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: `${f.color}18`, color: f.color }}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#11152F] mb-2">{f.title}</h3>
                <p className="text-sm text-[#536184]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-[#F5F8FF] border-t border-[#E4EAF6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="section-eyebrow mb-3">Experience Designed for You</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#11152F] mb-4">How It Works</h2>
          </div>

          {/* Rider / Driver toggle */}
          <div className="flex justify-center mb-10">
            <div className="pill-nav">
              <button className={`pill-nav-item ${activeFeatureTab === "rider" ? "active" : ""}`} onClick={() => setActiveFeatureTab("rider")}>For Riders</button>
              <button className={`pill-nav-item ${activeFeatureTab === "driver" ? "active" : ""}`} onClick={() => setActiveFeatureTab("driver")}>For Drivers</button>
            </div>
          </div>

          {activeFeatureTab === "rider" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { step: "01", title: "Set Your Location", desc: "Enter your pickup and destination with smart autocomplete.", icon: MapPin },
                { step: "02", title: "Choose a Ride", desc: "Pick from Economy, Standard or Premium options with live fares.", icon: Car },
                { step: "03", title: "Get Matched", desc: "A verified driver accepts your ride in under 30 seconds.", icon: Users },
                { step: "04", title: "Arrive Safely", desc: "OTP-verified boarding, live tracking and digital receipt.", icon: Shield },
              ].map(s => (
                <div key={s.step} className="rf-card p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-200">
                  <div className="text-5xl font-black text-[#EAEFFF] absolute -top-1 -right-1 select-none">{s.step}</div>
                  <div className="w-10 h-10 rounded-xl bg-[#EAEFFF] flex items-center justify-center mb-4 text-[#304BFF] group-hover:bg-[#304BFF] group-hover:text-white transition-all">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[#11152F] text-sm mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[#536184]">{s.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { step: "01", title: "Sign Up to Drive", desc: "Complete your profile, add vehicle details and get verified.", icon: Users },
                { step: "02", title: "Go Online", desc: "Toggle availability to start receiving ride requests nearby.", icon: Wifi },
                { step: "03", title: "Accept Requests", desc: "Review fare, distance and pickup before accepting a ride.", icon: Phone },
                { step: "04", title: "Earn & Grow", desc: "Weekly payouts, performance bonuses and flexible hours.", icon: Star },
              ].map(s => (
                <div key={s.step} className="rf-card p-5 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-200">
                  <div className="text-5xl font-black text-[#EAEFFF] absolute -top-1 -right-1 select-none">{s.step}</div>
                  <div className="w-10 h-10 rounded-xl bg-[#EAEFFF] flex items-center justify-center mb-4 text-[#304BFF] group-hover:bg-[#304BFF] group-hover:text-white transition-all">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[#11152F] text-sm mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[#536184]">{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA SECTION
      ═══════════════════════════════════════ */}
      <section id="about" className="py-20 bg-white border-t border-[#E4EAF6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="rf-card p-10 sm:p-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(circle at 50% 0%, #EAEFFF, transparent 70%)" }} />
            <p className="section-eyebrow mb-4">Ready to Ride?</p>
            <h2 className="text-3xl sm:text-5xl font-black text-[#11152F] mb-4">
              Join the <span className="text-gradient">RideFlow</span> Community
            </h2>
            <p className="text-[#536184] mb-8 max-w-xl mx-auto">
              Experience smarter, safer and more convenient transportation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate("/auth")} className="btn-primary px-8 py-3 text-base">
                Get Started as Rider <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate("/auth")} className="btn-ghost px-8 py-3 text-base">
                Join as Driver <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer className="bg-[#11152F] text-white/70 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ background: "var(--gradient-primary)" }}>R</div>
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
