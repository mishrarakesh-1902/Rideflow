// src/components/RiderDashboard.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Navigation,
  Star,
  User,
  Settings,
  Menu,
  Car,
  DollarSign,
} from "lucide-react";

import api from "@/services/api";
import { mapboxSuggest } from "@/services/mapbox";
import { createRazorpayOrder, openRazorpayCheckout } from "@/services/payment";

// ✅ Import Mapbox React components
import Map, { Marker } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const RiderDashboard = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [rideType, setRideType] = useState("standard");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedPickupCenter, setSelectedPickupCenter] = useState<[number, number] | null>(null);
  const [selectedDestCenter, setSelectedDestCenter] = useState<[number, number] | null>(null);

  // ✅ Load Mapbox token from env
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error("❌ Missing Mapbox token! Please add VITE_MAPBOX_TOKEN in your .env file.");
    } else {
      console.log("✅ Mapbox token loaded:", MAPBOX_TOKEN.slice(0, 10) + "...");
    }
  }, [MAPBOX_TOKEN]);

  const rideOptions = [
    { id: "economy", name: "Economy", price: 850, display: "₹8.50", time: "5 min", icon: <Car className="w-5 h-5" /> },
    { id: "standard", name: "Standard", price: 1250, display: "₹12.50", time: "3 min", icon: <Car className="w-5 h-5" /> },
    { id: "premium", name: "Premium", price: 1800, display: "₹18.00", time: "2 min", icon: <Car className="w-5 h-5" /> },
  ];

  const recentRides = [
    { id: 1, from: "Downtown Plaza", to: "Tech Campus", price: "₹14.50", rating: 5, date: "Today" },
    { id: 2, from: "Airport", to: "Hotel District", price: "₹28.00", rating: 5, date: "Yesterday" },
    { id: 3, from: "Shopping Mall", to: "Home", price: "₹9.50", rating: 4, date: "2 days ago" },
  ];

  // Suggestions for pickup
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      if (!pickup) {
        setPickupSuggestions([]);
        return;
      }
      try {
        const res = await mapboxSuggest(pickup, 5);
        if (mounted) setPickupSuggestions(res);
      } catch (err) {
        console.error("❌ Pickup suggestion error:", err);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [pickup]);

  // Suggestions for destination
  useEffect(() => {
    let mounted = true;
    const t = setTimeout(async () => {
      if (!destination) {
        setDestinationSuggestions([]);
        return;
      }
      try {
        const res = await mapboxSuggest(destination, 5);
        if (mounted) setDestinationSuggestions(res);
      } catch (err) {
        console.error("❌ Destination suggestion error:", err);
      }
    }, 250);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [destination]);

  const handleSelectPickupSuggestion = (s: any) => {
    setPickup(s.place_name);
    setSelectedPickupCenter(s.center);
    setPickupSuggestions([]);
  };

  const handleSelectDestSuggestion = (s: any) => {
    setDestination(s.place_name);
    setSelectedDestCenter(s.center);
    setDestinationSuggestions([]);
  };

  // Request ride with Razorpay integration
  const handleRequestRide = async () => {
    try {
      if (!pickup || !destination || !selectedPickupCenter || !selectedDestCenter) {
        alert("Please enter pickup and destination");
        return;
      }

      const option = rideOptions.find((r) => r.id === rideType)!;

      const payload = {
        pickup: {
          address: pickup,
          location: { type: "Point", coordinates: selectedPickupCenter },
        },
        destination: {
          address: destination,
          location: { type: "Point", coordinates: selectedDestCenter },
        },
        rideType,
        fare: option.price,
      };

      console.log("🚕 Ride request payload:", payload);

      const res = await api.post("/rides/request", payload);
      const ride = res.data;

      const order = await createRazorpayOrder({
        amount: option.price,
        currency: "INR",
        metadata: { rideId: ride._id },
      });

      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || "";
      await openRazorpayCheckout({
        key: RAZORPAY_KEY,
        orderId: order.orderId,
        amount: order.amount,
        name: "RideFlow",
        description: `Payment for ride ${ride._id}`,
        prefill: {
          name: JSON.parse(localStorage.getItem("user") || "{}")?.name,
          email: JSON.parse(localStorage.getItem("user") || "{}")?.email,
        },
        onSuccess: async (response) => {
          try {
            await api.post("/payments/razorpay/verify", {
              ...response,
              rideId: ride._id,
            });
            alert("Payment successful and ride booked!");
          } catch (err) {
            console.error("❌ Payment verify error", err);
            alert("Payment succeeded but verification failed. Please contact support.");
          }
        },
        onFailure: (err) => {
          console.error("❌ Razorpay dismissed or failed", err);
          alert("Payment cancelled or failed. Ride request may be pending.");
        },
      });
    } catch (err: any) {
      console.error("❌ Request ride error", err);
      alert(err?.response?.data?.message || err?.message || "Failed to request ride");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="glass-card rounded-none p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gradient">RideFlow</h1>
              <p className="text-sm text-muted-foreground">Good morning, Sarah!</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-3 gap-6">
        {/* Booking Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Book Your Ride</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pickup and Destination Inputs */}
              <div className="space-y-3">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="Pickup location"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="pl-10"
                  />
                  {pickupSuggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {pickupSuggestions.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleSelectPickupSuggestion(s)}
                        >
                          {s.place_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Navigation className="absolute left-3 top-3 w-4 h-4 text-primary" />
                  <Input
                    placeholder="Where to?"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="pl-10"
                  />
                  {destinationSuggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {destinationSuggestions.slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => handleSelectDestSuggestion(s)}
                        >
                          {s.place_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ride Options */}
              <div className="space-y-3">
                <h4 className="font-medium">Choose Ride Type</h4>
                {rideOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      rideType === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setRideType(option.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-primary">{option.icon}</div>
                        <div>
                          <div className="font-medium">{option.name}</div>
                          <div className="text-sm text-muted-foreground">{option.time} away</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{option.display}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full btn-gradient h-12 text-lg" onClick={handleRequestRide}>
                Request Ride
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-96 lg:h-[600px]">
            <CardContent className="p-0">
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                  longitude: 77.2090, // New Delhi
                  latitude: 28.6139,
                  zoom: 10,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                onError={(e) => console.error("❌ Mapbox map error:", e.error)}
                onLoad={() => console.log("✅ Map loaded successfully")}
              >
                {/* Default marker */}
                <Marker longitude={77.2090} latitude={28.6139} color="red" />

                {/* ✅ Pickup marker */}
                {selectedPickupCenter && (
                  <Marker longitude={selectedPickupCenter[0]} latitude={selectedPickupCenter[1]} color="green" />
                )}

                {/* ✅ Destination marker */}
                {selectedDestCenter && (
                  <Marker longitude={selectedDestCenter[0]} latitude={selectedDestCenter[1]} color="blue" />
                )}
              </Map>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Rides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRides.map((ride) => (
                <div
                  key={ride.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {ride.from} → {ride.to}
                      </div>
                      <div className="text-sm text-muted-foreground">{ride.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {ride.price.slice(1)}
                    </div>
                    <div className="flex items-center text-sm">
                      {[...Array(ride.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-500 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiderDashboard;
