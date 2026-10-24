// src/components/RiderDashboard.tsx
import { useState, useEffect, useRef, useMemo } from "react";
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
  History,
  AlertCircle,
  Home,
  Clock,
  CreditCard,
  Wallet,
  Headphones,
  Phone,
  MessageSquare,
  Share2,
  X,
  ChevronRight,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  Sparkles,
  Search,
  LogOut,
  Calendar,
  Compass,
} from "lucide-react";

import api from "@/services/api";
import { mapboxSuggest } from "@/services/mapbox";
import { createRazorpayOrder, openRazorpayCheckout } from "@/services/payment";

import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { initSocket, getSocket } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ProfileModal from "./ProfileModal";
import RideHistoryModal from "./RideHistoryModal";
import CopilotChat from "./CopilotChat";

const RiderDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [rideType, setRideType] = useState("standard");
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [selectedPickupCenter, setSelectedPickupCenter] = useState<[number, number] | null>(null);
  const [selectedDestCenter, setSelectedDestCenter] = useState<[number, number] | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [estFare, setEstFare] = useState<number | null>(null);
  const [estETA, setEstETA] = useState<number | null>(null);

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
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [acceptedModalOpen, setAcceptedModalOpen] = useState(false);
  const [acceptedFare, setAcceptedFare] = useState<number | null>(null);
  const [acceptedPaid, setAcceptedPaid] = useState<boolean | null>(null);
  const [acceptedOtp, setAcceptedOtp] = useState<string | null>(null);
  const [fareExplanation, setFareExplanation] = useState<string>("");
  const { toast } = useToast();

  // Driver search & timeout states
  const [activeSidebarTab, setActiveSidebarTab] = useState<"book" | "rides" | "payments" | "wallet" | "profile">("book");
  const [activeHistoryFilter, setActiveHistoryFilter] = useState<"all" | "completed" | "ongoing" | "cancelled">("all");
  const [paymentChoice, setPaymentChoice] = useState<"upi" | "card" | "wallet" | "cash">("upi");
  const [isSearching, setIsSearching] = useState(false);
  const [searchCountdown, setSearchCountdown] = useState(60);
  const [noDriverModalOpen, setNoDriverModalOpen] = useState(false);
  const [searchPayload, setSearchPayload] = useState<any>(null);
  const searchTimerRef = useRef<any>(null);

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    };
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) {
      console.warn("Rider not authenticated, redirecting to /auth");
      navigate("/auth");
      return;
    }
    fetchMyActiveBooking();
  }, []);

  const startSearch = (bookingId: string, payload?: any, initialTime: number = 60) => {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (payload) setSearchPayload(payload);
    setIsSearching(true);
    setSearchCountdown(initialTime);

    let timeLeft = initialTime;
    searchTimerRef.current = setInterval(async () => {
      timeLeft -= 1;
      setSearchCountdown(timeLeft);

      if (timeLeft <= 0) {
        if (searchTimerRef.current) clearInterval(searchTimerRef.current);
        setIsSearching(false);
        // Auto-cancel on backend
        try {
          await api.patch(`/bookings/${bookingId}/cancel`, {
            cancellationReason: 'No driver available nearby'
          });
        } catch (e) {
          console.warn('Auto-cancel on timeout failed', e);
        }
        setActiveBookingId(null);
        setActiveBooking(null);
        setNoDriverModalOpen(true);
      }
    }, 1000);
  };

  const stopSearch = () => {
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setIsSearching(false);
  };

  const cancelSearch = async () => {
    stopSearch();
    if (activeBookingId) {
      try {
        await api.patch(`/bookings/${activeBookingId}/cancel`, {
          cancellationReason: 'Cancelled by rider during search'
        });
      } catch (e) {
        console.warn('Cancel search API failed', e);
      }
    }
    setActiveBookingId(null);
    setActiveBooking(null);
    toast({ title: 'Search Cancelled', description: 'Your ride request has been cancelled.' });
  };

  // Helper: fetch user's active booking (requested, accepted, or started)
  const fetchMyActiveBooking = async () => {
    try {
      const resp = await api.get('/rides/my');
      const bookings = resp.data.bookings || [];
      // pick the most recent active booking
      const active = bookings.find((b: any) =>
        b.status === 'requested' ||
        b.status === 'accepted' ||
        b.status === 'started' ||
        b.status === 'in_progress'
      );

      if (active) {
        const pCoords = active.pickup?.location?.coordinates;
        const dCoords = active.destination?.location?.coordinates;

        if (active.pickup?.address) setPickup(active.pickup.address);
        if (active.destination?.address) setDestination(active.destination.address);
        if (pCoords) setSelectedPickupCenter(pCoords);
        if (dCoords) setSelectedDestCenter(dCoords);
        if (active.fare) setEstFare(active.fare);
        if (active.estimatedTimeMin) setEstETA(active.estimatedTimeMin);
        if (active.fareExplanation) setFareExplanation(active.fareExplanation);

        // Fetch route geometry for Mapbox so the blue line appears on the map
        if (pCoords && dCoords && MAPBOX_TOKEN) {
          try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pCoords[0]},${pCoords[1]};${dCoords[0]},${dCoords[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
            const r = await fetch(url);
            const d = await r.json();
            if (d?.routes?.[0]?.geometry) {
              setRouteGeoJSON({
                type: "Feature",
                geometry: d.routes[0].geometry,
                properties: {},
              });
            }
          } catch (e) {
            console.warn("Failed to fetch route on booking restore:", e);
          }
        }

        if (active.status === 'requested') {
          // Calculate remaining search seconds from createdAt
          const createdTime = new Date(active.createdAt).getTime();
          const elapsedSec = Math.floor((Date.now() - createdTime) / 1000);
          const remainingSec = Math.max(0, 60 - elapsedSec);

          if (remainingSec > 0) {
            setActiveBookingId(active._id);
            startSearch(active._id, active, remainingSec);
          } else {
            setNoDriverModalOpen(true);
          }
        } else {
          // Accepted / In Progress
          stopSearch();
          setActiveBookingId(active._id);
          setActiveBooking(active);
          if (active.otp) setAcceptedOtp(String(active.otp));
        }

        // ensure we join booking room to receive live updates
        try {
          const s = getSocket() || initSocket();
          s.emit('join:booking', { bookingId: active._id });
        } catch (e) {
          console.warn('join booking in fetchMyActiveBooking failed', e);
        }
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
    stopSearch();
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

    // Booking created via AI Copilot or direct request
    const onBookingCreated = async (payload: any) => {
      console.log("🚕 booking:created received:", payload);
      if (payload?.bookingId) {
        socket.emit("join:booking", { bookingId: payload.bookingId });
        setActiveBookingId(payload.bookingId);

        if (payload.pickup?.address) setPickup(payload.pickup.address);
        if (payload.destination?.address) setDestination(payload.destination.address);

        const pickupCoords = payload.pickup?.location?.coordinates;
        const destCoords = payload.destination?.location?.coordinates;

        if (pickupCoords) setSelectedPickupCenter(pickupCoords);
        if (destCoords) setSelectedDestCenter(destCoords);
        if (payload.fare) setEstFare(payload.fare);
        if (payload.estimatedTimeMin) setEstETA(payload.estimatedTimeMin);
        if (payload.fareExplanation) setFareExplanation(payload.fareExplanation);

        // Fetch route geometry for Mapbox so the blue line appears on the map
        if (pickupCoords && destCoords && MAPBOX_TOKEN) {
          try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
            const r = await fetch(url);
            const d = await r.json();
            if (d?.routes?.[0]?.geometry) {
              setRouteGeoJSON({
                type: "Feature",
                geometry: d.routes[0].geometry,
                properties: {},
              });
            }
          } catch (e) {
            console.warn("Failed to fetch route for AI booking:", e);
          }
        }

        startSearch(payload.bookingId, payload);
        toast({
          title: "Ride Booked by AI Assistant",
          description: "Searching for nearby drivers...",
        });
      }
    };
    socket.on("booking:created", onBookingCreated);

    const onCustomAIBooking = (e: any) => {
      console.log("🚕 ai:booking-created window event received:", e.detail);
      if (e.detail) {
        onBookingCreated(e.detail);
      }
    };
    window.addEventListener("ai:booking-created", onCustomAIBooking);

    const onRideAccepted = (data: any) => {
      console.log("🔔 ride:accepted received", data);
      stopSearch();
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
          stopSearch();
          setActiveBookingId(null);
          setActiveBooking(null);
          setAcceptedModalOpen(false);
          toast({ title: 'Booking cancelled', description: 'Your ride was cancelled' });
        }
      } catch (e) {}
    });

    // OTP regenerated by driver
    socket.on('otp:regenerated', (p: any) => {
      try {
        if (p?.bookingId && p.bookingId === activeBookingRef.current) {
          if (p.newOtp) {
            setAcceptedOtp(String(p.newOtp));
            toast({ title: 'New OTP Generated', description: `Your new OTP is: ${p.newOtp}` });
          }
        }
      } catch (e) {
        console.warn('Error handling OTP regeneration', e);
      }
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
      socket.off("booking:created", onBookingCreated);
      window.removeEventListener("ai:booking-created", onCustomAIBooking);
      socket.off("ride:accepted", onRideAccepted);
      socket.off("driver:location", onDriverLocation);
      socket.off('ride:completed');
      // leave booking room if any when component unmounts
      if (activeBookingRef.current) {
        socket.emit('leave:booking', { bookingId: activeBookingRef.current });
      }
    };
  }, []);

  // Close payment options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPaymentOptions && !(event.target as Element).closest('.payment-options')) {
        setShowPaymentOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPaymentOptions]);

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

  const rideOptions = useMemo(() => {
    const dist = routeDistanceKm > 0 ? routeDistanceKm : 5;
    const perKm = 10;
    const econPaise = Math.max(5000, Math.round(dist * perKm * 0.8 * 100));
    const stdPaise = Math.max(5000, Math.round(dist * perKm * 1.0 * 100));
    const premPaise = Math.max(7500, Math.round(dist * perKm * 1.5 * 100));

    return [
      {
        id: "economy" as const,
        name: "Economy",
        price: econPaise,
        display: `₹${(econPaise / 100).toFixed(2)}`,
        time: estETA ? `${Math.max(2, estETA - 2)} min` : "5 min",
        icon: <Car className="w-5 h-5" />,
      },
      {
        id: "standard" as const,
        name: "Standard",
        price: stdPaise,
        display: `₹${(stdPaise / 100).toFixed(2)}`,
        time: estETA ? `${estETA} min` : "3 min",
        icon: <Car className="w-5 h-5" />,
      },
      {
        id: "premium" as const,
        name: "Premium",
        price: premPaise,
        display: `₹${(premPaise / 100).toFixed(2)}`,
        time: estETA ? `${Math.max(1, estETA - 3)} min` : "2 min",
        icon: <Car className="w-5 h-5" />,
      },
    ];
  }, [routeDistanceKm, estETA]);

  useEffect(() => {
    const selected = rideOptions.find((r) => r.id === rideType);
    if (selected) {
      setEstFare(selected.price);
    }
  }, [rideType, rideOptions]);

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
          const route = data.routes[0];
          setRouteGeoJSON({
            type: "Feature",
            geometry: route.geometry,
          });

          const distKm = Math.round(((route.distance || 0) / 1000) * 10) / 10;
          const durMin = Math.max(1, Math.round((route.duration || 0) / 60));
          setRouteDistanceKm(distKm);
          setEstETA(durMin);
        } else {
          setEstFare(null);
          setEstETA(null);
        }
      } catch (err) {
        console.error("❌ Error fetching route:", err);
        setEstFare(null);
        setEstETA(null);
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

      if (booking?.fareExplanation) {
        setFareExplanation(booking.fareExplanation);
      }

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
              startSearch(booking._id, payload);
              toast({
                title: "Payment Successful",
                description: "Looking for nearby drivers to accept your trip...",
              });
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
        startSearch(booking._id, payload);
        toast({
          title: "Ride Requested",
          description: "Looking for nearby drivers to accept your trip...",
        });
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
    <div className="min-h-screen bg-[#F5F8FF] text-[#11152F] flex flex-col md:flex-row h-screen overflow-hidden">
      {/* ══════════════════════════════════════════════════════
          SCREEN 5 & 8: LEFT SIDEBAR
      ══════════════════════════════════════════════════════ */}
      <aside className="w-full md:w-64 bg-white border-r border-[#E4EAF6] flex flex-col shrink-0 z-20">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#E4EAF6]">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-xl bg-[#304BFF] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#304BFF]/25">
              R
            </div>
            <span className="text-xl font-black text-[#11152F] tracking-tight">
              Ride<span className="text-[#304BFF]">Flow</span>
            </span>
          </div>
          <span className="text-[10px] bg-[#EAEFFF] text-[#304BFF] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Rider
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {[
            { id: "home", label: "Home", icon: Home, onClick: () => navigate("/") },
            { id: "book", label: "Book Ride", icon: Compass, onClick: () => setActiveSidebarTab("book") },
            { id: "rides", label: "My Rides", icon: Clock, onClick: () => setActiveSidebarTab("rides") },
            { id: "payments", label: "Payments", icon: CreditCard, onClick: () => setActiveSidebarTab("payments") },
            { id: "wallet", label: "Wallet", icon: Wallet, onClick: () => setActiveSidebarTab("wallet") },
            { id: "support", label: "Support", icon: Headphones, onClick: () => {
              const el = document.getElementById("open-copilot");
              if (el) el.click();
              else toast({ title: "AI Assistant", description: "Use the AI chatbot at the bottom right!" });
            }},
            { id: "profile", label: "Profile", icon: User, onClick: () => setProfileModalOpen(true) },
          ].map((item) => {
            const isActive = activeSidebarTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#EAEFFF] text-[#304BFF] shadow-xs"
                    : "text-[#536184] hover:bg-[#F5F8FF] hover:text-[#11152F]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#304BFF]" : "text-[#536184]"}`} />
                <span>{item.label}</span>
                {item.id === "book" && isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#304BFF]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card at Bottom of Sidebar */}
        <div className="p-4 border-t border-[#E4EAF6] bg-[#F5F8FF]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0" onClick={() => setProfileModalOpen(true)}>
              <div className="w-9 h-9 rounded-full bg-[#EAEFFF] border border-[#304BFF]/30 flex items-center justify-center text-[#304BFF] font-bold text-sm shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "R"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#11152F] truncate">
                  {currentUser?.name || "Rakesh Kumar"}
                </p>
                <p className="text-[10px] text-[#536184] truncate">
                  {currentUser?.email || "rakesh@example.com"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/");
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#536184] hover:text-red-500 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* ── TAB 1: BOOK RIDE (Screen 5, 6, 7) ── */}
        {activeSidebarTab === "book" && (
          <>
            {/* Left Content / Booking Controls Panel */}
            <div className="w-full md:w-[420px] lg:w-[460px] bg-white border-r border-[#E4EAF6] flex flex-col h-full overflow-y-auto shadow-sm z-10">

              {/* SEARCH / WHERE TO BOX */}
              <div className="p-5 border-b border-[#E4EAF6] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#11152F]">Where are you going?</h2>
                  <div className="flex items-center gap-1.5 text-xs text-[#536184]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    Live Drivers
                  </div>
                </div>

                {/* Pickup Field */}
                <div className="relative">
                  <div className="flex items-center gap-2.5 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                    <input
                      placeholder="Pickup location"
                      value={pickup}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        mapboxSuggest(e.target.value, (suggs) => setPickupSuggestions(suggs || []));
                      }}
                      className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                    />
                    {pickup && (
                      <button onClick={() => setPickup("")} className="text-[#A0AABF] hover:text-[#536184]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {pickupSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E4EAF6] shadow-xl overflow-hidden max-h-44 overflow-y-auto">
                      {pickupSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F8FF] text-[#11152F] flex items-center gap-2 border-b border-[#F5F8FF] last:border-0"
                          onClick={() => {
                            setPickup(s.place_name);
                            setSelectedPickupCenter(s.center);
                            setPickupSuggestions([]);
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5 text-[#304BFF] shrink-0" />
                          <span className="truncate">{s.place_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Field with Swap */}
                <div className="relative">
                  <div className="flex items-center gap-2.5 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shrink-0" />
                    <input
                      placeholder="Drop location"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        mapboxSuggest(e.target.value, (suggs) => setDestinationSuggestions(suggs || []));
                      }}
                      className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
                    />
                    {destination && (
                      <button onClick={() => setDestination("")} className="text-[#A0AABF] hover:text-[#536184]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {destinationSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#E4EAF6] shadow-xl overflow-hidden max-h-44 overflow-y-auto">
                      {destinationSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F5F8FF] text-[#11152F] flex items-center gap-2 border-b border-[#F5F8FF] last:border-0"
                          onClick={() => {
                            setDestination(s.place_name);
                            setSelectedDestCenter(s.center);
                            setDestinationSuggestions([]);
                          }}
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                          <span className="truncate">{s.place_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Destination Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {[
                    { label: "Home", icon: "🏠" },
                    { label: "Work", icon: "💼" },
                    { label: "Airport", icon: "✈️" },
                    { label: "Metro Station", icon: "🚇" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setDestination(chip.label);
                        mapboxSuggest(chip.label, (suggs) => {
                          if (suggs && suggs[0]) {
                            setSelectedDestCenter(suggs[0].center);
                          }
                        });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#F5F8FF] text-[#536184] border border-[#E4EAF6] hover:bg-[#EAEFFF] hover:text-[#304BFF] hover:border-[#304BFF]/30 transition"
                    >
                      <span>{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCHING ACTIVE STATE */}
              {isSearching && !activeBooking ? (
                <div className="p-5 space-y-4">
                  {/* Radar Searching Animation */}
                  <div className="relative flex flex-col items-center justify-center py-8 rounded-2xl bg-gradient-to-b from-[#EAEFFF] to-white border border-[#E4EAF6] overflow-hidden">
                    <div className="absolute w-36 h-36 rounded-full border-2 border-[#304BFF]/20 animate-ping opacity-75" />
                    <div className="absolute w-24 h-24 rounded-full border-2 border-[#304BFF]/30 animate-pulse" />
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#304BFF] to-[#6B7FFF] flex items-center justify-center text-white shadow-xl shadow-[#304BFF]/30 z-10">
                      <Car className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="mt-4 text-center z-10 px-3">
                      <h3 className="text-sm font-bold text-[#11152F] flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#304BFF] animate-pulse" />
                        Looking for Drivers
                      </h3>
                      <p className="text-xs text-[#536184] mt-1">Matching with nearest available cars...</p>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="p-3.5 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#536184]">Search Timeout</span>
                      <span className="font-mono font-bold text-[#304BFF]">{searchCountdown}s</span>
                    </div>
                    <div className="w-full h-2 bg-[#E4EAF6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(searchCountdown / 60) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Route Summary */}
                  <div className="p-3.5 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span className="text-[#11152F] truncate font-medium">{pickup || "Pickup"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                      <span className="text-[#11152F] truncate font-medium">{destination || "Destination"}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E4EAF6] flex items-center justify-between">
                      <span className="text-[#536184]">Estimated Fare</span>
                      <span className="font-bold text-[#304BFF]">₹{estFare ? (estFare / 100).toFixed(2) : "--"}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-500 hover:text-red-600 hover:bg-red-50 h-10 text-xs font-semibold"
                    onClick={cancelSearch}
                  >
                    Cancel Search
                  </Button>
                </div>
              ) : activeBooking ? (
                /* ── SCREEN 7: LIVE RIDE TRACKING ── */
                <div className="p-5 space-y-4">
                  {/* Driver Arriving Status Pill */}
                  <div className="inline-flex items-center gap-2 bg-[#EDFBF4] border border-emerald-200 text-[#16B86A] px-3.5 py-1.5 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#16B86A] animate-pulse" />
                    Driver Arriving • 3 min away
                  </div>

                  {/* Driver Card */}
                  <div className="p-4 rounded-2xl border border-[#E4EAF6] bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#EAEFFF] border border-[#304BFF]/30 flex items-center justify-center text-[#304BFF] font-bold text-base">
                          {driverInfo?.name ? driverInfo.name.charAt(0) : "R"}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#11152F]">
                            {driverInfo?.name || activeBooking?.driver?.name || "Rahul Verma"}
                          </h4>
                          <p className="text-xs text-[#536184] flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            4.9 (3,200+ rides)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold bg-[#F5F8FF] border border-[#E4EAF6] px-2.5 py-1 rounded-lg text-[#11152F]">
                          DL 0C AX 1C34
                        </span>
                        <p className="text-[10px] text-[#536184] mt-1">Blue Sedan</p>
                      </div>
                    </div>

                    {/* Quick Action Buttons: Call | Chat | Share | Cancel */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#E4EAF6]">
                      <button
                        onClick={() => alert("Calling driver: " + (driverInfo?.phone || "+91 98765 43210"))}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F5F8FF] hover:bg-[#EAEFFF] text-[#304BFF] transition text-[11px] font-semibold"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                      <button
                        onClick={() => {
                          const el = document.getElementById("open-copilot");
                          if (el) el.click();
                        }}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F5F8FF] hover:bg-[#EAEFFF] text-[#304BFF] transition text-[11px] font-semibold"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </button>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: "My RideFlow Trip", text: `I am on a RideFlow trip with Rahul Verma. Tracking: ${window.location.href}` });
                          } else {
                            toast({ title: "Trip Shared", description: "Trip details link copied to clipboard!" });
                          }
                        }}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F5F8FF] hover:bg-[#EAEFFF] text-[#304BFF] transition text-[11px] font-semibold"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                      <button
                        onClick={cancelMyBooking}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition text-[11px] font-semibold"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Ride Details Panel */}
                  <div className="p-4 rounded-2xl border border-[#E4EAF6] bg-[#F5F8FF] space-y-3">
                    <h5 className="text-xs font-bold uppercase text-[#536184] tracking-wider">Ride Details</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-[#11152F]">{activeBooking?.pickup?.address || pickup || "Connaught Place"}</p>
                          <p className="text-[10px] text-[#536184]">Pickup • 3 min</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-[#11152F]">{activeBooking?.destination?.address || destination || "Karol Bagh"}</p>
                          <p className="text-[10px] text-[#536184]">Drop • 12 min</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OTP Box */}
                  {acceptedOtp && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EAEFFF] to-white border border-[#304BFF]/30 text-center space-y-1.5 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#536184]">
                        OTP for Driver Verification
                      </p>
                      <div className="font-mono text-3xl font-black text-[#304BFF] tracking-[0.3em]">
                        {acceptedOtp}
                      </div>
                      <p className="text-[10px] text-[#536184]">Share this code only after getting in the car</p>
                    </div>
                  )}

                  <Button
                    className="w-full h-11 bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white font-bold rounded-xl shadow-md hover:opacity-90"
                    onClick={() => setAcceptedModalOpen(true)}
                  >
                    View Full Details
                  </Button>
                </div>
              ) : (
                /* ── SCREEN 5: REGULAR BOOKING PANEL ── */
                <div className="p-5 space-y-4">
                  {/* 30% OFF PROMO BANNER */}
                  <div
                    className="rounded-2xl p-4 text-white relative overflow-hidden shadow-md flex items-center justify-between"
                    style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)" }}
                  >
                    <div className="relative z-10 space-y-1 max-w-[210px]">
                      <span className="inline-block bg-[#304BFF] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        SPECIAL
                      </span>
                      <h4 className="text-xl font-black tracking-tight leading-tight">30% OFF</h4>
                      <p className="text-xs text-white/80">On your first 3 rides with code <span className="font-mono font-bold text-yellow-300">RIDEFLOW30</span></p>
                    </div>
                    {/* Decorative Car Illustration */}
                    <div className="text-4xl select-none animate-pulse">
                      🚗
                    </div>
                  </div>

                  {/* CHOOSE A RIDE SECTION */}
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[#11152F]">Choose a ride</h3>

                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: "auto", name: "Auto", icon: "🛺", fare: "₹50 - 90", time: "2 min", category: "economy" },
                        { id: "standard", name: "Sedan", icon: "🚗", fare: "₹120 - 165", time: "3 min", category: "standard" },
                        { id: "economy", name: "SUV", icon: "🚙", fare: "₹200 - 265", time: "4 min", category: "standard" },
                        { id: "premium", name: "Luxury", icon: "🏎️", fare: "₹450 - 660", time: "6 min", category: "premium" },
                      ].map((v) => {
                        const isSelected = rideType === v.id || (rideType === "standard" && v.id === "standard");
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setRideType(v.id as any)}
                            className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                              isSelected
                                ? "border-[#304BFF] bg-[#EAEFFF] shadow-sm ring-2 ring-[#304BFF]/20"
                                : "border-[#E4EAF6] bg-white hover:border-[#304BFF]/40 hover:bg-[#F5F8FF]"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl">{v.icon}</span>
                              <span className="text-[10px] font-semibold text-[#536184] bg-white/80 border border-[#E4EAF6] px-1.5 py-0.5 rounded-md">
                                {v.time}
                              </span>
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isSelected ? "text-[#304BFF]" : "text-[#11152F]"}`}>
                                {v.name}
                              </p>
                              <p className="text-[11px] font-extrabold text-[#11152F] mt-0.5">
                                {estFare ? `₹${(estFare / 100).toFixed(0)}` : v.fare}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="p-3.5 rounded-xl border border-[#E4EAF6] bg-[#F5F8FF] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#E4EAF6] flex items-center justify-center text-[#304BFF]">
                        {paymentMethod === "online" ? <CreditCard className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#11152F]">
                          {paymentMethod === "online" ? "Online (UPI / Card)" : "Cash on Arrival"}
                        </p>
                        <p className="text-[10px] text-[#536184]">
                          {paymentMethod === "online" ? "Fast & contactless" : "Pay driver directly"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(paymentMethod === "online" ? "cash" : "online")}
                      className="text-xs font-bold text-[#304BFF] hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Book Ride Button */}
                  <Button
                    type="button"
                    onClick={handleRequestRide}
                    className="w-full h-12 bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#304BFF]/25 hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    Confirm & Book Ride
                  </Button>
                </div>
              )}
            </div>

            {/* Right Map Canvas (Screen 5 & 6) */}
            <div className="flex-1 h-full relative">
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                initialViewState={{
                  longitude: currentLocation ? currentLocation[0] : 77.209,
                  latitude: currentLocation ? currentLocation[1] : 28.6139,
                  zoom: 12,
                }}
                style={{ width: "100%", height: "100%" }}
              >
                {/* User Current Location Marker */}
                {currentLocation && (
                  <Marker longitude={currentLocation[0]} latitude={currentLocation[1]} color="#304BFF" />
                )}
                {/* Pickup Location Marker */}
                {selectedPickupCenter && (
                  <Marker longitude={selectedPickupCenter[0]} latitude={selectedPickupCenter[1]} color="#10b981" />
                )}
                {/* Destination Location Marker */}
                {selectedDestCenter && (
                  <Marker longitude={selectedDestCenter[0]} latitude={selectedDestCenter[1]} color="#ef4444" />
                )}
                {/* Driver Live Marker */}
                {displayDriverLocation && (
                  <Marker longitude={displayDriverLocation[0]} latitude={displayDriverLocation[1]}>
                    <div className="text-3xl filter drop-shadow-md animate-pulse">🚗</div>
                  </Marker>
                )}
                {/* Route Polyline */}
                {routeGeoJSON && (
                  <Source id="route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      source="route"
                      layout={{ "line-cap": "round", "line-join": "round" }}
                      paint={{ "line-color": "#304BFF", "line-width": 5 }}
                    />
                  </Source>
                )}
              </Map>

              {/* Floating Route Pill on Top of Map */}
              {(routeDistanceKm > 0 || estETA) && (
                <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md border border-[#E4EAF6] rounded-full px-4 py-2 shadow-lg flex items-center gap-3 z-30">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#304BFF] animate-ping" />
                  <span className="text-xs font-bold text-[#11152F]">
                    {routeDistanceKm > 0 ? `${routeDistanceKm.toFixed(1)} km` : "Route Found"} • {estETA ? `${estETA} min away` : "Quick Match"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB 2: SCREEN 8: RIDER - MY RIDES & ANALYTICS ── */}
        {activeSidebarTab === "rides" && (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-[#F5F8FF]">
            {/* Left side: My Rides list */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#11152F]">My Rides</h2>
                  <p className="text-xs text-[#536184] mt-0.5">Manage and track your travel history</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#E4EAF6] text-[#536184] hover:bg-white text-xs"
                  onClick={() => setHistoryModalOpen(true)}
                >
                  <History className="w-3.5 h-3.5 mr-1 text-[#304BFF]" /> All Trips
                </Button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 p-1 bg-white border border-[#E4EAF6] rounded-2xl w-fit">
                {(["all", "completed", "ongoing", "cancelled"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveHistoryFilter(tab)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      activeHistoryFilter === tab
                        ? "bg-[#304BFF] text-white shadow-xs"
                        : "text-[#536184] hover:text-[#11152F]"
                    }`}
                  >
                    {tab === "all" ? "All Rides" : tab}
                  </button>
                ))}
              </div>

              {/* Ride Cards (Exact as Screen 8 in Reference) */}
              <div className="space-y-3">
                {[
                  { id: "1", from: "Connaught Place", to: "Karol Bagh", fare: "₹150", date: "14 May 2025, 4:32 PM", status: "completed" },
                  { id: "2", from: "India Gate", to: "Lajpat Nagar", fare: "₹220", date: "10 May 2025, 1:15 PM", status: "completed" },
                  { id: "3", from: "Airport T3", to: "Connaught Place", fare: "₹450", date: "8 May 2025, 8:45 AM", status: "completed" },
                  { id: "4", from: "Karol Bagh", to: "Rajiv Chowk", fare: "₹80", date: "5 May 2025, 6:00 PM", status: "cancelled" },
                ]
                  .filter((r) => activeHistoryFilter === "all" || r.status === activeHistoryFilter)
                  .map((ride) => (
                    <div
                      key={ride.id}
                      className="p-4 bg-white rounded-2xl border border-[#E4EAF6] shadow-xs flex items-center justify-between hover:border-[#304BFF]/40 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm text-[#11152F]">
                          <span>{ride.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#536184]" />
                          <span>{ride.to}</span>
                        </div>
                        <p className="text-[11px] text-[#536184]">{ride.date}</p>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="font-black text-sm text-[#11152F]">{ride.fare}</p>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            ride.status === "completed"
                              ? "bg-[#EDFBF4] text-[#16B86A]"
                              : "bg-red-50 text-red-500"
                          }`}
                        >
                          {ride.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right side: Ride Analytics (Screen 8 in Reference) */}
            <div className="w-full lg:w-[360px] bg-white border-l border-[#E4EAF6] p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-[#11152F]">Ride Analytics</h3>
                <span className="text-xs text-[#536184] font-semibold bg-[#F5F8FF] border border-[#E4EAF6] px-2.5 py-1 rounded-lg">
                  Monthly ▼
                </span>
              </div>

              {/* Monthly Bar Chart Mock */}
              <div className="space-y-2">
                <div className="h-32 flex items-end gap-2 pt-4 px-2">
                  {[40, 65, 30, 85, 50, 95].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#304BFF] to-[#6B7FFF] opacity-80 hover:opacity-100 transition"
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[9px] text-[#536184]">
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#F5F8FF] border border-[#E4EAF6]">
                  <p className="text-2xl font-black text-[#11152F]">12</p>
                  <p className="text-[11px] text-[#536184] font-medium mt-0.5">Total Rides</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F5F8FF] border border-[#E4EAF6]">
                  <p className="text-2xl font-black text-[#304BFF]">₹12.5K</p>
                  <p className="text-[11px] text-[#536184] font-medium mt-0.5">Total Spent</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F5F8FF] border border-[#E4EAF6]">
                  <p className="text-2xl font-black text-[#11152F]">4.8 ★</p>
                  <p className="text-[11px] text-[#536184] font-medium mt-0.5">Avg Rating</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F5F8FF] border border-[#E4EAF6]">
                  <p className="text-2xl font-black text-[#16B86A]">98%</p>
                  <p className="text-[11px] text-[#536184] font-medium mt-0.5">Completion Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: SCREEN 12: PAYMENT OPTIONS ── */}
        {activeSidebarTab === "payments" && (
          <div className="flex-1 p-8 flex items-center justify-center bg-[#F5F8FF]">
            <div className="w-full max-w-md bg-white rounded-3xl border border-[#E4EAF6] shadow-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-[#E4EAF6] pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#11152F]">Choose Payment Method</h3>
                  <p className="text-xs text-[#536184] mt-0.5">Select your preferred transaction option</p>
                </div>
                <CreditCard className="w-5 h-5 text-[#304BFF]" />
              </div>

              <div className="space-y-3">
                {[
                  { id: "upi", title: "UPI", desc: "Pay using any UPI App (GPay, PhonePe, Paytm)", icon: "⚡" },
                  { id: "card", title: "Credit / Debit Card", desc: "Visa, Mastercard, RuPay cards accepted", icon: "💳" },
                  { id: "wallet", title: "RideFlow Wallet", desc: "Available Balance: ₹100", icon: "👛" },
                  { id: "cash", title: "Cash", desc: "Pay cash directly to the driver on arrival", icon: "💵" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentChoice(m.id as any)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      paymentChoice === m.id
                        ? "border-[#304BFF] bg-[#EAEFFF] shadow-xs"
                        : "border-[#E4EAF6] bg-white hover:bg-[#F5F8FF]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{m.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-[#11152F]">{m.title}</p>
                        <p className="text-[10px] text-[#536184] mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      paymentChoice === m.id ? "border-[#304BFF] bg-[#304BFF]" : "border-[#A0AABF]"
                    }`}>
                      {paymentChoice === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                className="w-full h-12 bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white font-bold rounded-xl shadow-md hover:opacity-95"
                onClick={() => {
                  toast({ title: "Payment Method Updated", description: `Default method set to ${paymentChoice.toUpperCase()}` });
                  setActiveSidebarTab("book");
                }}
              >
                Save Payment Method
              </Button>

              <p className="text-[10px] text-center text-[#536184] flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#16B86A]" /> 100% Secure & Encrypted Payments
              </p>
            </div>
          </div>
        )}

        {/* ── TAB 4: WALLET ── */}
        {activeSidebarTab === "wallet" && (
          <div className="flex-1 p-8 flex items-center justify-center bg-[#F5F8FF]">
            <div className="w-full max-w-md bg-white rounded-3xl border border-[#E4EAF6] shadow-xl p-6 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#EAEFFF] border border-[#304BFF]/30 flex items-center justify-center mx-auto text-[#304BFF]">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-[#536184] font-medium uppercase tracking-wider">RideFlow Wallet</p>
                <h3 className="text-4xl font-black text-[#11152F] mt-1">₹100.00</h3>
                <p className="text-xs text-[#16B86A] mt-1">✓ Active & Ready to Use</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["+ ₹200", "+ ₹500", "+ ₹1,000"].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => toast({ title: "Wallet Top-up", description: `${amt} added to wallet balance.` })}
                    className="py-2.5 rounded-xl border border-[#E4EAF6] hover:border-[#304BFF] hover:bg-[#EAEFFF] text-xs font-bold text-[#11152F] transition"
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <Button
                className="w-full h-11 bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white font-bold rounded-xl shadow-md"
                onClick={() => setActiveSidebarTab("book")}
              >
                Back to Booking
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          MODALS & OVERLAYS
      ══════════════════════════════════════════════════════ */}
      {/* No Driver Timeout Dialog */}
      <Dialog open={noDriverModalOpen} onOpenChange={setNoDriverModalOpen}>
        <DialogContent className="bg-white text-[#11152F] border border-[#E4EAF6] max-w-sm p-6 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-9 h-9 text-amber-500 animate-pulse" />
          </div>
          <DialogHeader className="space-y-1 text-center">
            <DialogTitle className="text-xl font-bold text-[#11152F] text-center">No Drivers Nearby</DialogTitle>
            <DialogDescription className="text-xs text-[#536184] pt-1 text-center">
              All nearby drivers are currently busy or offline. Please try booking again in a few moments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              className="w-full h-10 font-semibold bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white hover:opacity-90"
              onClick={() => { setNoDriverModalOpen(false); handleRequestRide(); }}
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#E4EAF6] hover:bg-[#F5F8FF] h-10 text-xs text-[#536184]"
              onClick={() => setNoDriverModalOpen(false)}
            >
              Modify Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver Accepted Modal */}
      <Dialog open={acceptedModalOpen} onOpenChange={setAcceptedModalOpen}>
        <DialogContent className="bg-white text-[#11152F] border border-[#E4EAF6] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#11152F]">Driver Accepted! 🚗</DialogTitle>
            <DialogDescription className="text-[#536184]">
              {driverInfo?.name ? `${driverInfo.name} is coming to pick you up` : "A driver has accepted your ride"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center space-y-2 mb-4">
              <p className="text-lg font-bold text-[#11152F]">{driverInfo?.name || "Rahul Verma"}</p>
              <p className="text-sm text-[#536184] flex justify-center items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" /> 4.9 • {driverInfo?.vehicle || "Blue Sedan"}
              </p>
            </div>
            {acceptedFare && (
              <p className="text-center text-sm text-[#536184]">
                Fare: <span className="font-bold text-[#304BFF]">₹{(acceptedFare / 100).toFixed(2)}</span>
              </p>
            )}
            {acceptedOtp && (
              <div className="mt-4 p-4 rounded-xl bg-[#EAEFFF] border border-[#304BFF]/30 text-center">
                <p className="text-xs text-[#536184] mb-2 uppercase tracking-wider font-semibold">Share OTP with driver</p>
                <p className="font-mono text-3xl font-bold text-[#304BFF] tracking-widest">{acceptedOtp}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              className="bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white hover:opacity-90 w-full"
              onClick={() => setAcceptedModalOpen(false)}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Modal (Screen 13) */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        initialUser={currentUser}
        onProfileUpdated={(updated) => setCurrentUser(updated)}
      />

      {/* Ride History Modal */}
      <RideHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        userRole="rider"
      />

      {/* AI Support Copilot (Screen 11) */}
      <CopilotChat />
    </div>
  );
};

export default RiderDashboard;
