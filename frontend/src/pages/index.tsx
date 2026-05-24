import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Car, 
  Shield, 
  Clock, 
  Star, 
  ChevronRight,
} from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("rider");

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Smart Location",
      description: "AI-powered pickup and drop-off with precise location tracking",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Secure",
      description: "Advanced safety features and verified driver profiles",
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Fast Matching",
      description: "Get matched with nearby drivers in under 30 seconds",
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Premium Experience",
      description: "5-star rated service with luxury vehicle options",
    },
  ];

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<[number, number] | null>(null);
  const [selectedDest, setSelectedDest] = useState<[number, number] | null>(null);
  const [estFare, setEstFare] = useState<number | null>(null);
  const [estETA, setEstETA] = useState<number | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<number | null>(null);
  const [avgWait, setAvgWait] = useState<string | null>(null);
  const [rideType, setRideType] = useState("standard");

  useEffect(() => {
    let mounted = true;
    async function fetchAvailable() {
      try {
        const res = await fetch("/api/drivers/available");
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted) return;
        const count = j.available || 0;
        setAvailableDrivers(count);
        setAvgWait(count > 0 ? `${Math.max(2, Math.round(6 / count))} min` : "—");
      } catch (e) {
        // ignore
      }
    }
    fetchAvailable();
    const id = setInterval(fetchAvailable, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    async function fetchEstimate() {
      if (!selectedPickup || !selectedDest || !MAPBOX_TOKEN) return;
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${selectedPickup[0]},${selectedPickup[1]};${selectedDest[0]},${selectedDest[1]}?overview=full&geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json && json.routes && json.routes.length > 0) {
          const route = json.routes[0];
          const distKm = (route.distance || 0) / 1000;
          const durMin = Math.round((route.duration || 0) / 60);
          const fareRupees = 30 + 12 * distKm;
          setEstFare(Math.round(fareRupees * 100));
          setEstETA(durMin);
        }
      } catch (e) {
        console.warn("Estimate failed", e);
      }
    }
    fetchEstimate();
  }, [selectedPickup, selectedDest, MAPBOX_TOKEN]);

  const onSuggest = async (q: string, which: "pickup" | "dest") => {
    try {
      if (!q || !MAPBOX_TOKEN) return;
      const url = `/api/mapbox/suggest?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const json = await res.json();
      const items = json.results || [];
      if (which === "pickup") setPickupSuggestions(items);
      else setDestinationSuggestions(items);
    } catch (e) {
      // ignore
    }
  };

  const selectSuggestion = (item: any, which: "pickup" | "dest") => {
    const coords = item.center as [number, number];
    if (which === "pickup") {
      setSelectedPickup(coords);
      setPickup(item.place_name);
      setPickupSuggestions([]);
    } else {
      setSelectedDest(coords);
      setDestination(item.place_name);
      setDestinationSuggestions([]);
    }
  };

  const handleRequestRideMini = async () => {
    if (!selectedPickup || !selectedDest) return alert("Select pickup and destination");
    if (requesting) return;
    setRequesting(true);
    try {
      const payload = {
        pickup: { address: pickup, location: { type: "Point", coordinates: selectedPickup } },
        destination: { address: destination, location: { type: "Point", coordinates: selectedDest } },
        rideType: "standard",
        paymentMethod: "cash",
      };
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to request a ride");
        setRequesting(false);
        return;
      }
      const resp = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert(err.message || "Request failed");
        setRequesting(false);
        return;
      }
      window.location.href = "/dashboard/rider";
    } catch (e) {
      console.error("Request mini ride failed", e);
      alert("Failed to request ride");
    } finally {
      setRequesting(false);
    }
  };

  const rideOptions = [
    { id: "economy", name: "Economy", price: 850, display: "₹8.50", time: "5 min", icon: <Car className="w-5 h-5" /> },
    { id: "standard", name: "Standard", price: 1250, display: "₹12.50", time: "3 min", icon: <Car className="w-5 h-5" /> },
    { id: "premium", name: "Premium", price: 1800, display: "₹18.00", time: "2 min", icon: <Car className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gradient">RideFlow</h1>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#home" className="hover:text-primary transition">Home</a>
            <a href="#features" className="hover:text-primary transition">Features</a>
            <a href="#cta" className="hover:text-primary transition">Get Started</a>
            <Button className="btn-gradient px-6 py-2" onClick={() => window.location.href = '/auth'}>Sign In</Button>
          </div>
        </div>
      </header>

      <section id="home" className="relative min-h-screen pt-20 pb-20 flex items-center">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(72,0,255,0.36),transparent_50%),radial-gradient(circle_at_80%_40%,rgba(0,183,255,0.22),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-8">
            <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold">Modern Urban Mobility</p>
            <h1 className="text-6xl md:text-7xl font-black leading-tight">Ride Smart. <span className="text-gradient">Drive Better</span>.</h1>
            <p className="text-xl text-gray-300 max-w-xl leading-relaxed">The future of transportation is here. Real-time tracking, verified drivers, and OTP-protected rides designed for modern cities.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="btn-gradient px-8 py-3 h-12 text-lg font-semibold" onClick={() => window.location.href = '/auth'}>Get Started</Button>
              <Button variant="outline" className="px-8 py-3 h-12 text-lg border-white/30 hover:bg-white/10" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Learn More</Button>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="glass-card p-4 text-center rounded-lg">
                <p className="text-2xl font-bold text-teal-400">500K+</p>
                <p className="text-xs text-muted-foreground mt-1">Active Users</p>
              </div>
              <div className="glass-card p-4 text-center rounded-lg">
                <p className="text-2xl font-bold text-purple-400">50K+</p>
                <p className="text-xs text-muted-foreground mt-1">Drivers</p>
              </div>
              <div className="glass-card p-4 text-center rounded-lg">
                <p className="text-2xl font-bold text-blue-400">4.9★</p>
                <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 md:p-8 border border-white/10 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Book Your Ride</h3>
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center"><Car className="w-4 h-4 text-teal-400" /></div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="text-xs uppercase text-muted-foreground mb-2 block">From</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-teal-400" />
                  <Input placeholder="Pickup location" value={pickup} onChange={(e) => { setPickup(e.target.value); onSuggest(e.target.value,'pickup'); }} className="pl-10 bg-slate-800 border-white/10 h-10" />
                </div>
                {pickupSuggestions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-lg border border-white/10 z-10 max-h-40 overflow-y-auto">{pickupSuggestions.slice(0,4).map((s:any)=>(<div key={s.id} className="px-3 py-2 hover:bg-slate-700 text-sm cursor-pointer" onClick={()=>selectSuggestion(s,'pickup')}>{s.place_name}</div>))}</div>)}
              </div>
              <div className="relative">
                <label className="text-xs uppercase text-muted-foreground mb-2 block">To</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-purple-400" />
                  <Input placeholder="Destination" value={destination} onChange={(e) => { setDestination(e.target.value); onSuggest(e.target.value,'dest'); }} className="pl-10 bg-slate-800 border-white/10 h-10" />
                </div>
                {destinationSuggestions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-lg border border-white/10 z-10 max-h-40 overflow-y-auto">{destinationSuggestions.slice(0,4).map((s:any)=>(<div key={s.id} className="px-3 py-2 hover:bg-slate-700 text-sm cursor-pointer" onClick={()=>selectSuggestion(s,'dest')}>{s.place_name}</div>))}</div>)}
              </div>
              <div>
                <label className="text-xs uppercase text-muted-foreground mb-2 block">Ride Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {rideOptions.map((option)=> (
                    <button key={option.id} type="button" className={`rounded-lg p-2 text-xs font-medium transition-all ${rideType === option.id ? 'bg-gradient text-white border border-transparent' : 'bg-slate-800 text-white border border-white/10 hover:border-white/20'}`} onClick={()=>setRideType(option.id)}>
                      <div className="font-bold">{option.name}</div>
                      <div className="text-xs mt-1 opacity-80">{option.display}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-4 pb-4 border-t border-white/10">
                <div className="text-center"><p className="text-xs text-muted-foreground">Est. Fare</p><p className="text-lg font-bold text-gradient mt-1">₹{estFare? (estFare/100).toFixed(2):'—'}</p></div>
                <div className="text-center"><p className="text-xs text-muted-foreground">ETA</p><p className="text-lg font-bold text-gradient mt-1">{estETA?`${estETA}m`:'—'}</p></div>
              </div>
              <Button className="w-full btn-gradient h-11 font-semibold" onClick={handleRequestRideMini} disabled={!selectedPickup || !selectedDest || requesting}>{requesting?'Requesting...':'Book Now'}</Button>
              <p className="text-xs text-center text-muted-foreground">{availableDrivers && availableDrivers > 0 ? `${availableDrivers} drivers nearby • Avg wait ${avgWait}` : 'No drivers available'}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-slate-900/50 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-3">Why Choose RideFlow</p>
            <h2 className="text-5xl font-bold mb-6">Built for <span className="text-gradient">Modern Mobility</span></h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">Experience the next generation of ride-sharing with cutting-edge technology and customer-first design</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature,index)=>(
              <div key={index} className="glass-card p-6 border border-white/5 rounded-xl hover:border-white/20 transition-all hover:shadow-xl group">
                <div className="text-teal-400 mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-black/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-3">Powerful Features</p>
            <h2 className="text-5xl font-bold mb-6">Experience Designed for You</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">Whether you're a rider or driver, RideFlow puts you in control</p>
          </div>
          <div className="flex justify-center mb-12">
            <div className="glass-card p-2 inline-flex rounded-full border border-white/10">
              <button onClick={()=>setActiveTab("rider")} className={`px-8 py-2 rounded-full font-semibold transition-all text-sm ${activeTab==="rider"?"bg-gradient text-white shadow-lg":"text-gray-300 hover:text-white"}`}>For Riders</button>
              <button onClick={()=>setActiveTab("driver")} className={`px-8 py-2 rounded-full font-semibold transition-all text-sm ${activeTab==="driver"?"bg-gradient text-white shadow-lg":"text-gray-300 hover:text-white"}`}>For Drivers</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="glass-card p-8 border border-white/10 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">{activeTab==="rider"?"Rider Features":"Driver Features"}</h3>
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-purple-500 opacity-20 flex items-center justify-center">{activeTab==="rider"?<Star className="w-5 h-5 text-teal-400"/>:<Car className="w-5 h-5 text-purple-400"/>}</div>
              </div>
              <div className="space-y-3">
                {activeTab==="rider"?(
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><MapPin className="w-4 h-4 text-teal-400"/><span>Real-time GPS tracking</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Shield className="w-4 h-4 text-teal-400"/><span>Emergency SOS features</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Star className="w-4 h-4 text-teal-400"/><span>Driver ratings & reviews</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Clock className="w-4 h-4 text-teal-400"/><span>Schedule rides in advance</span></div>
                  </>
                ):(
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Car className="w-4 h-4 text-purple-400"/><span>Smart ride matching</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Shield className="w-4 h-4 text-purple-400"/><span>Insurance & protection</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><MapPin className="w-4 h-4 text-purple-400"/><span>Optimized routes</span></div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"><Star className="w-4 h-4 text-purple-400"/><span>Earnings analytics</span></div>
                  </>
                )}
              </div>
            </div>
            <div className="glass-card p-8 border border-white/10 rounded-2xl">
              <h3 className="text-2xl font-bold mb-6">{activeTab==="rider"?"Start Your Journey":"Earn with Us"}</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-teal-500/20 to-purple-500/20 p-4 rounded-xl border border-white/10">
                  <div className="text-3xl font-bold text-gradient">{activeTab==="rider"?"₹0":"₹" + ((availableDrivers || 0) / 100).toFixed(2)}</div>
                  <div className="text-sm text-gray-300 mt-1">{activeTab==="rider"?"Sign-up bonus":"Average daily earnings"}</div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-300">{activeTab==="rider"?"Get your first ride with ₹100 credits when you sign up":"Flexible hours • Competitive rates • Weekly payouts"}</p>
                </div>
                <Button className="w-full btn-gradient h-10 mt-4" onClick={()=>window.location.href='/auth'}>{activeTab==="rider"?"Book Your First Ride":"Apply Now"}</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="py-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center px-6">
          <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-4">Ready?</p>
          <h2 className="text-5xl md:text-6xl font-bold mb-8">Join the <span className="text-gradient">RideFlow</span> Community</h2>
          <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">Experience smarter, safer, and more convenient transportation today</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="btn-gradient px-8 py-3 h-12 text-base font-semibold" onClick={()=>window.location.href='/auth'}>Get Started as Rider<ChevronRight className="w-4 h-4 ml-2" /></Button>
            <Button variant="outline" className="px-8 py-3 h-12 text-base font-semibold border-white/30 hover:bg-white/10" onClick={()=>window.location.href='/auth'}>Join as Driver<ChevronRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400"><p>© 2024 RideFlow. All rights reserved.</p></div>
      </footer>
    </div>
  );
};

export default Index;
