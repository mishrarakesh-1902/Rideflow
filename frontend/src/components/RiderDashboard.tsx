// src/components/RiderDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { initSocket, getSocket } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const RiderDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [rideType, setRideType] = useState("standard");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedPickupCenter, setSelectedPickupCenter] = useState<[number, number] | null>(null);
  const [selectedDestCenter, setSelectedDestCenter] = useState<[number, number] | null>(null);

  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [carPosition, setCarPosition] = useState<[number, number] | null>(null);

  const [driverInfo, setDriverInfo] = useState<any | null>(null);
  const [driverLocation, setDriverLocation] = useState<[number, number] | null>(null);
  const [displayDriverLocation, setDisplayDriverLocation] = useState<[number, number] | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [acceptedModalOpen, setAcceptedModalOpen] = useState(false);
  const [acceptedFare, setAcceptedFare] = useState<number | null>(null);
  const [acceptedPaid, setAcceptedPaid] = useState<boolean | null>(null);
  const [acceptedOtp, setAcceptedOtp] = useState<string | null>(null);
  const { toast } = useToast();

  // Keep a ref to the active booking so socket listeners can check latest value without reattaching
  const activeBookingRef = useRef<string | null>(null);
  useEffect(() => { activeBookingRef.current = activeBookingId; }, [activeBookingId]);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error("❌ Missing Mapbox token! Please add VITE_MAPBOX_TOKEN in your .env file.");
    } else {
      console.log("🧭 MAPBOX TOKEN LOADED:", MAPBOX_TOKEN.slice(0, 15) + "...");
    }
  }, [MAPBOX_TOKEN]);

  // Helper: fetch user's active booking (accepted/started)
  const fetchMyActiveBooking = async () => {
    try {
      const resp = await api.get('/rides/my');
      const bookings = resp.data.bookings || [];
      // pick the most recent booking that is accepted or started
      const active = bookings.find((b:any) => b.status === 'accepted' || b.status === 'started' || b.status === 'in_progress');
      if (active) {
        setActiveBookingId(active._id);
        setActiveBooking(active);
        if (active.otp) setAcceptedOtp(String(active.otp));
        // ensure we join booking room to receive live updates
        try { const s = getSocket() || initSocket(); s.emit('join:booking', { bookingId: active._id }); } catch (e) { console.warn('join booking in fetchMyActiveBooking failed', e); }
      }
      return active;
    } catch (err) {
      console.warn('fetchMyActiveBooking failed', err);
      return null;
    }
  };

  // Cancel my active booking (rider)
  const cancelMyBooking = async () => {
    if (!activeBookingId) return alert('No active booking to cancel');
    const ok = window.confirm('Are you sure you want to cancel this ride?');
    if (!ok) return;
    try {
      const res = await api.patch(`/bookings/${activeBookingId}/cancel`);
      setActiveBookingId(null);
      setActiveBooking(null);
      setAcceptedModalOpen(false);
      toast({ title: 'Booking cancelled', description: 'Your ride has been cancelled' });
    } catch (err: any) {
      console.error('Cancel booking failed', err?.response?.status, err?.response?.data || err);
      alert(err?.response?.data?.message || 'Failed to cancel booking');
    }
  };
  // Initialize socket and set up listeners
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    socket.on("connect", () => {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token") || null;

      // Emit auth information so back-end can validate socket session if it expects it.
      // Many servers expect token in the handshake; if your server already handles that,
      // this is redundant but harmless.
      const payload: any = {};
      if (user && user._id) payload.riderId = user._id;
      if (token) payload.token = token;

      socket.emit("rider:join", payload);
      console.log("✅ Socket connected; emitted rider:join", payload);

      // When socket connects, attempt to find any active booking that may have been accepted while
      // the rider was disconnected or missed the socket event.
      (async () => { try { await fetchMyActiveBooking(); } catch (e) { console.warn('initial fetchMyActiveBooking failed', e); } })();
    });



    const onRideAccepted = (data: any) => {
      console.log("🔔 ride:accepted received", data);
      setDriverInfo(data.driverInfo || { id: data.driverId });
      setActiveBookingId(data.bookingId || null);
      // set fare for modal display
      if (typeof data.fare === 'number') setAcceptedFare(data.fare);
      if (data.paymentMethod) setPaymentMethod(data.paymentMethod);

      // OTP (for demo we receive it in socket payload)
      if (data.otp) setAcceptedOtp(String(data.otp));

      if (data.bookingId) {
        socket.emit("join:booking", { bookingId: data.bookingId });
      }

      // open acceptance confirmation modal
      setAcceptedModalOpen(true);

      // fetch booking details so we can show fare/payment status
      (async () => {
        try {
          if (data.bookingId) {
            const resp = await api.get(`/bookings/${data.bookingId}`);
            const b = resp.data.booking;
            if (typeof b.fare === 'number') setAcceptedFare(b.fare);
            setAcceptedPaid(!!b.payment);
            setPaymentMethod(b.paymentMethod || paymentMethod);            // set full active booking so left panel can show driver/fare info
            setActiveBooking(b);
            if (b.otp) setAcceptedOtp(String(b.otp));
            // if payment method is cash or already paid, auto-close modal shortly
            if (b.paymentMethod === 'cash' || b.payment) {
              setTimeout(() => setAcceptedModalOpen(false), 3000);
            }
          }
        } catch (err) {
          // ignore
        }
      })();
    };

    // Ride started (driver verified OTP)
    socket.on('ride:started', (p: any) => {
      if (p?.bookingId && p.bookingId === activeBookingRef.current) {
        setAcceptedModalOpen(false);
        // update active booking status locally
        setActiveBooking((ab) => ab ? { ...ab, status: 'started', startedAt: p.startedAt } : ab);
        alert('✅ Ride started');
      }
    });

    // Booking cancelled (driver or rider cancellation)
    socket.on('booking:cancelled', (p: any) => {
      try {
        if (p?.bookingId && p.bookingId === activeBookingRef.current) {
          setActiveBookingId(null);
          setActiveBooking(null);
          setAcceptedModalOpen(false);
          toast({ title: 'Booking cancelled', description: 'Your ride was cancelled' });
        }
      } catch (e) {}
    });




    const onDriverLocation = (p: any) => {
      if (!p || typeof p.lng !== "number" || typeof p.lat !== "number") return;
      // don't show general driver pings when there's no active booking
      if (!activeBookingRef.current) return;
      setDriverLocation([p.lng, p.lat]);
    };

    socket.on("ride:accepted", onRideAccepted);
    socket.on("driver:location", onDriverLocation);
    socket.on("ride:completed", async (p: any) => {
      // open payment UI or inform rider
      try {
        const bookingId = p?.bookingId;
        if (!bookingId) return;
        const res = await api.get(`/bookings/${bookingId}`);
        const booking = res.data.booking;
        if (booking.paymentMethod === 'online' && !booking.payment) {
          // This is unlikely because online payments are taken at booking time, but keep fallback
          // fallback partial: booking.fare in paise -> convert to rupees
          const order = await createRazorpayOrder({ bookingId: booking._id, amount: (booking.fare || 0) / 100, currency: 'INR' });
          const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || '';
          await openRazorpayCheckout({
            key: RAZORPAY_KEY,
            orderId: order.orderId,
            amount: order.amount,
            name: 'RideFlow',
            description: `Payment for ride ${booking._id}`,
            prefill: { name: booking.rider?.name },
            onSuccess: async (response) => {
              try {
                await api.post('/payments/razorpay/verify', { ...response, rideId: booking._id });
                alert('✅ Payment successful. Thank you!');
              } catch (err: any) {
                console.error('Verification error', err);
                alert('Payment verified failed. Contact support.');
              }
            },
            onFailure: (err) => {
              console.error('Razorpay failed', err);
              alert('Payment failed or dismissed.');
            }
          });
        } else {
          // cash or already paid - play a short beep and show final message
          try {
            // play beep
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = 440;
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
            setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25); o.stop(); }, 300);
          } catch (e) { }

          alert(`Ride completed. Please ${booking.paymentMethod === 'cash' ? 'pay cash to driver' : 'thank you'} — Total ₹${(booking.fare/100).toFixed(2)}`);
        }

        // Clear driver-related UI state so the driver's marker disappears and booking state resets
        try {
          setDriverLocation(null);
          setDisplayDriverLocation(null);
          setDriverInfo(null);
          setActiveBookingId(null);
          setActiveBooking(null);
        } catch (e) {
          console.warn('Error clearing post-ride UI state', e);
        }

      } catch (err) {
        console.error('Error in ride:completed handler', err);
      }
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket connect error:", err);
    });

    return () => {
      socket.off("ride:accepted", onRideAccepted);
      socket.off("driver:location", onDriverLocation);
      socket.off('ride:completed');
      // leave booking room if any when component unmounts
      if (activeBookingRef.current) {
        socket.emit('leave:booking', { bookingId: activeBookingRef.current });
      }
    };
  }, []);

  // If the acceptance modal opens but we don't have an OTP, try to re-fetch booking details once
  useEffect(() => {
    if (!acceptedModalOpen) return;
    if (!activeBookingId) return;
    if (acceptedOtp) return;
    (async () => {
      try {
        const resp = await api.get(`/bookings/${activeBookingId}`);
        const b = resp.data.booking;
        if (b && b.otp) setAcceptedOtp(String(b.otp));
      } catch (e) {
        console.warn('Failed to refresh booking in modal', e);
      }
    })();
  }, [acceptedModalOpen, activeBookingId]);

  // Rider live location: when there's an active booking, rider will emit 'rider:location' to booking room
  // (driver will receive it when joined to booking room)
  // Note: the rider only shares location when a booking is active to respect privacy
  // Set up a watchPosition when activeBookingId is set
  useEffect(() => {
    if (!navigator.geolocation) return; // not available
    const socketClient = getSocket() || initSocket();
    let watchId: number | null = null;

    if (activeBookingId) {
      try {
        console.log('Rider: starting location watch for booking', activeBookingId);
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            // debug log and emit rider:location to booking room so driver can see it
            console.log('Rider: emitting location', { bookingId: activeBookingId, lng: longitude, lat: latitude });
            try {
              if (socketClient && (socketClient.connected || socketClient.connected === undefined)) {
                // socket connected or not strictly using socket.io connected flag in some environments
                socketClient.emit('rider:location', { lng: longitude, lat: latitude, bookingId: activeBookingId });
              } else {
                // fallback: try to initialize socket and emit after connect
                const s = initSocket();
                s.on && s.on('connect', () => s.emit('rider:location', { lng: longitude, lat: latitude, bookingId: activeBookingId }));
              }
            } catch (e) {
              console.warn('Rider: failed to emit rider:location', e);
            }
          },
          (err) => {
            console.warn('Geolocation error (rider watch):', err);
          },
          { enableHighAccuracy: true, maximumAge: 2000 }
        ) as unknown as number;
      } catch (e) {
        console.warn('Failed to start rider location watch', e);
      }
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeBookingId]);

  // Smooth driver marker movement: interpolate displayDriverLocation towards driverLocation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!driverLocation) return;
    let raf: number | null = null;
    let curr = displayDriverLocation || driverLocation;
    const step = () => {
      const [tx, ty] = driverLocation as [number, number];
      const [cx, cy] = curr as [number, number];
      const nx = cx + (tx - cx) * 0.2;
      const ny = cy + (ty - cy) * 0.2;
      curr = [nx, ny];
      setDisplayDriverLocation(curr as [number, number]);
      const dist = Math.hypot(tx - nx, ty - ny);
      if (dist > 0.0005) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplayDriverLocation(driverLocation);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [driverLocation]);

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

  // Set default pickup to current location's address (reverse geocode)
  useEffect(() => {
    const setDefaultPickup = async () => {
      if (!navigator.geolocation || !MAPBOX_TOKEN) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { longitude, latitude } = pos.coords;
          setCurrentLocation([longitude, latitude]);

          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
            );
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const address = data.features[0].place_name;
              setPickup(address);
              setSelectedPickupCenter([longitude, latitude]);
              setCarPosition([longitude, latitude]);
            }
          } catch (err) {
            console.error("❌ Error fetching address:", err);
          }

          if (mapRef.current) {
            try {
              mapRef.current.flyTo({ center: [longitude, latitude], zoom: 13, duration: 800 });
            } catch (err) {
              console.warn("⚠️ Map flyTo not supported:", err);
            }
          }
        },
        (err) => {
          console.warn("⚠️ Unable to fetch current location:", err.message);
        }
      );
    };

    setDefaultPickup();
  }, [MAPBOX_TOKEN]);

  // Pickup suggestions
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

  // Destination suggestions
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
    setCarPosition(s.center);
    setPickupSuggestions([]);
  };

  const handleSelectDestSuggestion = (s: any) => {
    setDestination(s.place_name);
    setSelectedDestCenter(s.center);
    setDestinationSuggestions([]);
  };

  // Fit map bounds when both points selected
  useEffect(() => {
    if (mapRef.current && selectedPickupCenter && selectedDestCenter) {
      const [lng1, lat1] = selectedPickupCenter;
      const [lng2, lat2] = selectedDestCenter;
      const bounds = [
        [Math.min(lng1, lng2), Math.min(lat1, lat2)],
        [Math.max(lng1, lng2), Math.max(lat1, lat2)],
      ];
      try {
        mapRef.current.fitBounds(bounds, { padding: 100, duration: 1000 });
      } catch (err) {
        console.error("❌ Error fitting map bounds:", err);
      }
    }
  }, [selectedPickupCenter, selectedDestCenter]);

  // Fetch route from Mapbox
  useEffect(() => {
    const fetchRoute = async () => {
      if (!selectedPickupCenter || !selectedDestCenter || !MAPBOX_TOKEN) return;
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${selectedPickupCenter[0]},${selectedPickupCenter[1]};${selectedDestCenter[0]},${selectedDestCenter[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          setRouteGeoJSON({
            type: "Feature",
            geometry: data.routes[0].geometry,
          });
        }
      } catch (err) {
        console.error("❌ Error fetching route:", err);
      }
    };
    fetchRoute();
  }, [selectedPickupCenter, selectedDestCenter, MAPBOX_TOKEN]);

  // ---------------- Request ride ----------------
  const handleRequestRide = async () => {
    try {
      // Auth guard
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!token || !user || !user._id) {
        alert("You must be logged in to request a ride. Please sign in.");
        navigate("/"); // change to login route if different
        return;
      }

      // Input guard
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
        paymentMethod,
      };

      // API call: rely on api interceptor, but add explicit header as fallback
      const res = await api.post("/rides/request", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const booking = res.data?.booking || res.data;
      console.log("🚕 Booking created:", booking);

      const socket = getSocket() || initSocket();
      const riderId = (user && user._id) || (user && user.id) || null;

      if (paymentMethod === 'online') {
        // For online payment flow we require payment before notifying drivers.
        // Create Razorpay order and open checkout now; after successful verify the server will mark booking requested and notify drivers.
        // option.price is stored in paise; convert to rupees for order creation
        let order;
        try {
          order = await createRazorpayOrder({ bookingId: booking._id, amount: option.price / 100, currency: "INR" });
        } catch (err: any) {
          console.error('❌ createRazorpayOrder failed', err);
          const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment service error';
          alert(msg);
          return; // abort flow
        }

        const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || "";

        await openRazorpayCheckout({
          key: RAZORPAY_KEY,
          orderId: order.orderId,
          amount: order.amount,
          name: "RideFlow",
          description: `Payment for ride ${booking._id}`,
          prefill: {
            name: user?.name,
            email: user?.email,
          },
          onSuccess: async (response) => {
            try {
              // Verify payment and let server handle driver notifications
              await api.post("/payments/razorpay/verify", { ...response, rideId: booking._id });

              // join booking room and set active booking
              socket.emit("join:booking", { bookingId: booking._id });
              setActiveBookingId(booking._id);

              alert("✅ Payment successful and ride will be matched with drivers shortly.");
            } catch (err: any) {
              console.error("❌ Payment verify error", err);
              alert("Payment succeeded but verification failed. Please contact support.");
            }
          },
          onFailure: (err) => {
            console.error("❌ Razorpay dismissed or failed", err);
            alert("Payment cancelled or failed. Ride request may be pending.");
          },
        });
      } else {
        // Cash payment chosen — notify drivers now and join booking room
        socket.emit("ride:request", { bookingId: booking._id, riderId, pickup: payload.pickup, destination: payload.destination, fare: payload.fare });
        socket.emit("join:booking", { bookingId: booking._id });
        setActiveBookingId(booking._id);
        alert('✅ Ride requested. Pay in cash to driver when the ride completes.');
      }
    } catch (err: any) {
      console.error("❌ Request ride error", err);
      if (err?.response?.status === 401) {
        alert("Unauthorized — your session may have expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
        return;
      }
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
          {!activeBooking ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Book Your Ride</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pickup & Destination */}
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
                      <div className="mt-2 space-y-1 bg-background border rounded-md shadow-sm">
                        {pickupSuggestions.slice(0, 5).map((s) => (
                          <div
                            key={s.id}
                            className="cursor-pointer text-sm p-2 hover:bg-muted"
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
                      <div className="mt-2 space-y-1 bg-background border rounded-md shadow-sm">
                        {destinationSuggestions.slice(0, 5).map((s) => (
                          <div
                            key={s.id}
                            className="cursor-pointer text-sm p-2 hover:bg-muted"
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
                        <div className="text-right font-bold text-primary">{option.display}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <h4 className="font-medium">Payment</h4>
                  <div className="flex items-center space-x-4">
                    <label className={`p-2 rounded-md border cursor-pointer ${paymentMethod === 'online' ? 'border-primary bg-primary/10' : ''}`} onClick={() => setPaymentMethod('online')}>
                      <input type="radio" name="payment" checked={paymentMethod === 'online'} readOnly className="mr-2" /> Pay Online
                    </label>
                    <label className={`p-2 rounded-md border cursor-pointer ${paymentMethod === 'cash' ? 'border-primary bg-primary/10' : ''}`} onClick={() => setPaymentMethod('cash')}>
                      <input type="radio" name="payment" checked={paymentMethod === 'cash'} readOnly className="mr-2" /> Pay Cash (COD)
                    </label>
                  </div>
                </div>

                <Button className="w-full btn-gradient h-12 text-lg" onClick={handleRequestRide}>
                  Request Ride
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Driver Assigned</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{driverInfo?.name || activeBooking?.driver?.name || 'Driver'}</div>
                    <div className="text-sm text-muted-foreground">{driverInfo?.phone || activeBooking?.driver?.phone}</div>
                    {driverInfo?.vehicle || activeBooking?.driver?.vehicle ? <div className="text-sm text-muted-foreground">Vehicle: {driverInfo?.vehicle || activeBooking?.driver?.vehicle}</div> : null}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-muted-foreground">Pickup</div>
                  <div className="font-medium">{activeBooking?.pickup?.address || '-'}</div>
                  <div className="text-sm text-muted-foreground mt-2">Destination</div>
                  <div className="font-medium">{activeBooking?.destination?.address || '-'}</div>
                </div>

                <div className="mt-3 text-center">
                  <div className="text-lg text-muted-foreground">Total Fare</div>
                  <div className="text-2xl font-bold text-gradient">₹{((acceptedFare ? acceptedFare/100 : ((activeBooking?.fare || 0)/100))).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{activeBooking?.paymentMethod === 'cash' ? 'Pay cash to driver' : 'Paid online'}</div>
                </div>

                {acceptedOtp && (
                  <div className="mt-3 flex items-center justify-center space-x-3">
                    <div className="px-3 py-2 rounded-md bg-primary/10 font-mono">OTP: <span className="font-bold">{acceptedOtp}</span></div>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(String(acceptedOtp)); toast({ title: 'OTP copied' })}}>Copy OTP</Button>
                  </div>
                )}

                <div className="mt-4 flex space-x-2">
                  <Button className="btn-gradient" onClick={()=>{ alert('Open tracking'); }}>Track Driver</Button>
                  <Button variant="outline" onClick={()=>{ alert('Contact: ' + (driverInfo?.phone|| 'n/a'))}}>Contact</Button>
                  <Button variant="ghost" className="text-red-600" onClick={cancelMyBooking}>Cancel Ride</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-96 lg:h-[600px]">
            <CardContent className="p-0 h-full">
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                initialViewState={{
                  longitude: currentLocation ? currentLocation[0] : 77.209,
                  latitude: currentLocation ? currentLocation[1] : 28.6139,
                  zoom: 11,
                }}
                style={{ width: "100%", height: "100%" }}
              >
                {currentLocation && <Marker longitude={currentLocation[0]} latitude={currentLocation[1]} color="red" />}

                {selectedPickupCenter && (
                  <Marker longitude={selectedPickupCenter[0]} latitude={selectedPickupCenter[1]} color="green" />
                )}

                {selectedDestCenter && (
                  <Marker longitude={selectedDestCenter[0]} latitude={selectedDestCenter[1]} color="blue" />
                )}

                {displayDriverLocation && (
                  <Marker longitude={displayDriverLocation[0]} latitude={displayDriverLocation[1]}>
                    <div className="text-xl">🚗</div>
                  </Marker>
                )}

                {carPosition && (
                  <Marker longitude={carPosition[0]} latitude={carPosition[1]} anchor="center">
                    <div className="animate-bounce">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                  </Marker>
                )}

                {routeGeoJSON && (
                  <Source id="route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      source="route"
                      layout={{ "line-cap": "round", "line-join": "round" }}
                      paint={{
                        "line-color": "#2563eb",
                        "line-width": 5,
                      }}
                    />
                  </Source>
                )}
              </Map>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accepted modal */}
      <Dialog open={acceptedModalOpen} onOpenChange={setAcceptedModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Driver on the way 🚗</DialogTitle>
            <DialogDescription>
              {driverInfo?.name ? (
                <div>
                  <div className="font-medium">{driverInfo.name} is coming to pick you up</div>
                  {driverInfo?.vehicle && <div className="text-sm text-muted-foreground">Vehicle: {driverInfo.vehicle}</div>}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">A driver has accepted your ride</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-success animate-scale-in" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mt-3">
              <div className="text-lg font-medium">{driverInfo?.name || 'Driver'}</div>
              {driverInfo?.phone && <div className="text-sm text-muted-foreground">{driverInfo.phone}</div>}
              {acceptedFare !== null && (
                <div className="mt-2 text-sm">Total: <span className="font-bold">₹{(acceptedFare/100).toFixed(2)}</span></div>
              )}

              {/* OTP display (rider) */}
              {acceptedOtp ? (
                <div className="mt-3 flex items-center justify-center space-x-3">
                  <div className="px-3 py-2 rounded-md bg-primary/10 font-mono">OTP: <span className="font-bold">{acceptedOtp}</span></div>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(String(acceptedOtp)); toast({ title: 'OTP copied', description: 'Share this OTP with the driver' }); }}>
                    Copy OTP
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-center space-x-3">
                  <div className="px-3 py-2 rounded-md bg-warning/10 text-warning">OTP not available yet</div>
                  <Button size="sm" variant="outline" onClick={async () => {
                    // Retry fetching booking details to get OTP
                    if (!activeBookingId) return alert('No active booking');
                    try {
                      const resp = await api.get(`/bookings/${activeBookingId}`);
                      const b = resp.data.booking;
                      if (b.otp) { setAcceptedOtp(String(b.otp)); toast({ title: 'OTP loaded' }); }
                      else { alert('OTP not yet generated. Please wait a moment.'); }
                    } catch (err) { console.error('Retry fetch OTP failed', err); alert('Failed to fetch OTP'); }
                  }}>Retry OTP</Button>
                </div>
              )}

              {paymentMethod === 'online' && acceptedPaid === false && (
                <div className="mt-3">
                  <Button className="btn-gradient" onClick={async () => {
                    if (!activeBookingId) return;
                    try {
                      // acceptedFare stored in paise; convert to rupees for order creation
                      const order = await createRazorpayOrder({ bookingId: activeBookingId, amount: (acceptedFare ?? 0) / 100 });
                      const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || '';
                      await openRazorpayCheckout({ key: RAZORPAY_KEY, orderId: order.orderId, amount: order.amount, name: 'RideFlow', description: `Payment for ride ${activeBookingId}`, prefill: {} , onSuccess: async (r) => { await api.post('/payments/razorpay/verify', { ...r, rideId: activeBookingId }); alert('Payment successful'); setAcceptedPaid(true); setAcceptedModalOpen(false); }, onFailure: () => alert('Payment failed')});
                    } catch (err) { console.error(err); alert('Payment error'); }
                  }}>Pay Now</Button>
                </div>
              )} 
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
