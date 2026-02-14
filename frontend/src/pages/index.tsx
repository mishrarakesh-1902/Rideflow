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
  Smartphone,
  ChevronRight,
  Play
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("rider");

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Smart Location",
      description: "AI-powered pickup and drop-off with precise location tracking"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Secure", 
      description: "Advanced safety features and verified driver profiles"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Fast Matching",
      description: "Get matched with nearby drivers in under 30 seconds"
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Premium Experience",
      description: "5-star rated service with luxury vehicle options"
    }
  ];

  // Mapbox helpers
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<[number, number] | null>(null);
  const [selectedDest, setSelectedDest] = useState<[number, number] | null>(null);
  const [estFare, setEstFare] = useState<number | null>(null);
  const [estETA, setEstETA] = useState<number | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<number | null>(null);
  const [avgWait, setAvgWait] = useState<string | null>(null);

  // fetch available drivers periodically (for preview card)
  useEffect(() => {
    let mounted = true;
    async function fetchAvailable() {
      try {
        const res = await fetch('/api/drivers/available');
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted) return;
        const count = j.available || 0;
        setAvailableDrivers(count);
        setAvgWait(count > 0 ? `${Math.max(2, Math.round(6 / count))} min` : '—');
      } catch (e) {}
    }
    fetchAvailable();
    const id = setInterval(fetchAvailable, 15000); // refresh every 15s
    return () => { mounted = false; clearInterval(id); };
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
          const distKm = (route.distance || 0) / 1000; // km
          const durMin = Math.round((route.duration || 0) / 60); // minutes
          // fare model: base 30 + 12 per km (in paise cents model: multiply rupees by 100)
          const fareRupees = 30 + 12 * distKm;
          setEstFare(Math.round(fareRupees * 100));
          setEstETA(durMin);
        }
      } catch (e) {
        console.warn('Estimate failed', e);
      }
    }
    fetchEstimate();
  }, [selectedPickup, selectedDest, MAPBOX_TOKEN]);

  const onSuggest = async (q: string, which: 'pickup' | 'dest') => {
    try {
      if (!q || !MAPBOX_TOKEN) return;
      const url = `/api/mapbox/suggest?q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const json = await res.json();
      const items = json.results || [];
      if (which === 'pickup') setPickupSuggestions(items);
      else setDestinationSuggestions(items);
    } catch (e) {
      // ignore
    }
  };

  const selectSuggestion = (item: any, which: 'pickup' | 'dest') => {
    const coords = item.center as [number, number];
    if (which === 'pickup') {
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
    if (!selectedPickup || !selectedDest) return alert('Select pickup and destination');
    if (requesting) return;
    setRequesting(true);
    try {
      const payload = {
        pickup: { address: pickup, location: { type: 'Point', coordinates: selectedPickup } },
        destination: { address: destination, location: { type: 'Point', coordinates: selectedDest } },
        rideType: 'standard',
        paymentMethod: 'cash',
      };
      const token = localStorage.getItem('token');
      if (!token) { alert('Please login to request a ride'); setRequesting(false); return; }
      const resp = await fetch('/api/rides/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json();
        alert(err.message || 'Request failed');
        setRequesting(false);
        return;
      }
      const j = await resp.json();
      // redirect to rider dashboard so they can see accepted driver etc.
      window.location.href = '/dashboard/rider';
    } catch (e) {
      console.error('Request mini ride failed', e);
      alert('Failed to request ride');
    } finally { setRequesting(false); }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center animated-bg">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Modern ride-hailing experience"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="animate-float">
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="text-gradient">RideFlow</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white max-w-3xl mx-auto">
              Experience the future of ride-hailing with our revolutionary platform. 
              Seamless, safe, and smarter transportation for everyone.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              <Smartphone className="mr-2" />
              Get Started Now
            </Button>
            <Button variant="outline" className="h-14 px-8 glass-card border-white/20 text-white hover:bg-white/20">
              <Play className="mr-2" />
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { number: "1M+", label: "Happy Riders" },
              { number: "50K+", label: "Active Drivers" },
              { number: "4.9", label: "Average Rating" },
              { number: "24/7", label: "Support" }
            ].map((stat, index) => (
              <div key={index} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="text-gradient">RideFlow?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced technology meets exceptional service to deliver the ultimate transportation experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card p-8 text-center hover:scale-105 transition-transform duration-300">
                <CardContent className="p-0">
                  <div className="text-primary mb-4 flex justify-center">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-24 animated-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Choose Your Experience
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Whether you're riding or driving, RideFlow has the perfect interface for you
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex justify-center mb-12">
            <div className="glass-card p-2 inline-flex rounded-full">
              <Button
                variant={activeTab === "rider" ? "default" : "ghost"}
                className={`rounded-full px-8 py-3 ${activeTab === "rider" ? "btn-gradient" : "text-white hover:bg-white/10"}`}
                onClick={() => setActiveTab("rider")}
              >
                For Riders
              </Button>
              <Button
                variant={activeTab === "driver" ? "default" : "ghost"}  
                className={`rounded-full px-8 py-3 ${activeTab === "driver" ? "btn-gradient" : "text-white hover:bg-white/10"}`}
                onClick={() => setActiveTab("driver")}
              >
                For Drivers
              </Button>
            </div>
          </div>
          
          {/* Preview Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="glass-card p-8">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">
                  {activeTab === "rider" ? "Rider Dashboard" : "Driver Dashboard"}
                </h3>
                <div className="bg-white/5 rounded-2xl p-6 mb-6">
                  {activeTab === "rider" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Where to?</span>
                        <MapPin className="text-primary" />
                      </div>
                      <div className="bg-white rounded-xl p-4 mb-4 shadow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-white/70">Pickup</div>
                            <Input placeholder="Enter pickup" value={pickup} onChange={(e) => { setPickup((e.target as HTMLInputElement).value); onSuggest((e.target as HTMLInputElement).value, 'pickup'); }} className="mb-1" />
                            {pickupSuggestions.length > 0 && (
                              <div className="bg-white rounded-md mt-1 text-left text-sm text-slate-800 p-2 max-h-40 overflow-auto shadow">
                                {pickupSuggestions.map((s:any) => (
                                  <div key={s.id} className="py-1 hover:bg-slate-100 rounded px-2 cursor-pointer" onClick={() => selectSuggestion(s, 'pickup')}>{s.place_name}</div>
                                ))}
                              </div>
                            )}

                            <div className="text-sm text-white/70 mt-3">Destination</div>
                            <Input placeholder="Enter destination" value={destination} onChange={(e) => { setDestination((e.target as HTMLInputElement).value); onSuggest((e.target as HTMLInputElement).value, 'dest'); }} />
                            {destinationSuggestions.length > 0 && (
                              <div className="bg-white rounded-md mt-1 text-left text-sm text-slate-800 p-2 max-h-40 overflow-auto shadow">
                                {destinationSuggestions.map((s:any) => (
                                  <div key={s.id} className="py-1 hover:bg-slate-100 rounded px-2 cursor-pointer" onClick={() => selectSuggestion(s, 'dest')}>{s.place_name}</div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-center items-center">
                            <div className="text-sm text-white/70">Vehicle</div>
                            <div className="mt-3 bg-white/10 rounded-lg p-4 w-full text-center">
                              <Car className="mx-auto text-primary text-4xl" />
                              <div className="text-white/80 mt-2">Standard</div>
                              <div className="text-sm text-white/70 mt-1">Comfortable and affordable</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between text-white/80 items-center">
                        <div>
                          <div className="text-sm text-slate-700">Estimated Fare</div>
                          <div className="text-xl font-bold mt-1 text-slate-900">{estFare ? `₹${(estFare/100).toFixed(2)}` : '—'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-700">ETA</div>
                          <div className="text-xl font-bold mt-1 text-slate-900">{estETA ? `${estETA} min` : '—'}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button className="w-full btn-gradient h-12 text-lg" onClick={handleRequestRideMini} disabled={!selectedPickup || !selectedDest || requesting}>
                          {requesting ? 'Requesting...' : 'Request Ride'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Online Status</span>
                        <div className="w-3 h-3 bg-success rounded-full"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">₹248</div>
                          <div className="text-white/70 text-sm">Today's Earnings</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-900">4.9</div>
                          <div className="text-white/70 text-sm">Rating</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button className="w-full btn-gradient">
                  {activeTab === "rider" ? "Request Ride" : "Go Online"} 
                  <ChevronRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="glass-card p-8">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-4 text-slate-800">Key Features</h3>
                <div className="space-y-4">
                  {activeTab === "rider" ? (
                    <>
                      <div className="flex items-center text-white/80">
                        <MapPin className="mr-3 text-primary" />
                        Real-time GPS tracking
                      </div>
                      <div className="flex items-center text-white/80">
                        <Shield className="mr-3 text-primary" />
                        Safety & security features
                      </div>
                      <div className="flex items-center text-white/80">
                        <Star className="mr-3 text-primary" />
                        Rate your experience
                      </div>
                      <div className="flex items-center text-white/80">
                        <Clock className="mr-3 text-primary" />
                        Schedule rides in advance
                      </div>
                      <div className="mt-4 bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-white/70">Drivers available nearby</div>
                            <div className="text-2xl font-bold text-gradient">{availableDrivers ?? '—'}</div>
                          </div>
                          <div className="text-right text-sm text-white/70">
                            <div>Avg wait: {avgWait ?? '—'}</div>
                            <div>Standard fare: {estFare ? `₹${(estFare/100).toFixed(2)}` : '—'}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-white/80">
                        <Car className="mr-3 text-primary" />
                        Smart ride matching
                      </div>
                      <div className="flex items-center text-white/80">
                        <MapPin className="mr-3 text-primary" />
                        Optimized routes
                      </div>
                      <div className="flex items-center text-white/80">
                        <Star className="mr-3 text-primary" />
                        Earnings analytics
                      </div>
                      <div className="flex items-center text-white/80">
                        <Shield className="mr-3 text-primary" />
                        Insurance coverage
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">Transform</span> Your Journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join millions of users who have already made the switch to smarter transportation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              Start Riding Today
            </Button>
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              Become a Driver
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <button 
        className="fab animate-pulse-glow"
        onClick={() => window.location.href = '/auth'}
      >
        <Car className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Index;