// src/components/DriverDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Car,
  DollarSign,
  Star,
  Clock,
  MapPin,
  User,
  TrendingUp,
  Settings,
  Menu,
  Navigation,
  Phone,
  MessageCircle,
  History,
  Home,
  Wallet,
  Headphones,
  Check,
  X,
  Shield,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  CheckCircle2,
  ChevronRight,
  Bell,
  Sparkles,
} from "lucide-react";
import api from "@/services/api";
import { initSocket, getSocket } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ProfileModal from "./ProfileModal";
import RideHistoryModal from "./RideHistoryModal";
import CopilotChat from "./CopilotChat";

type RideRequest = {
  bookingId: string;
  riderId?: string;
  pickup?: any;
  destination?: any;
  fare?: number;
  riderInfo?: any;
};

const DriverDashboard = () => {
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [activeDriverTab, setActiveDriverTab] = useState<"dashboard" | "requests" | "earnings" | "wallet">("dashboard");
  const [todayStats, setTodayStats] = useState({ earnings: 0, rides: 0, hours: 0, rating: 5 });
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [location, setLocation] = useState<{ lng: number; lat: number }>({ lng: 0, lat: 0 });

  // Map + route state
  const mapRef = useRef<any>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any | null>(null);
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentNavStep, setCurrentNavStep] = useState(0);
  const [riderLiveLocation, setRiderLiveLocation] = useState<[number, number] | null>(null);
  const [driverMarkerPosition, setDriverMarkerPosition] = useState<[number, number] | null>(null);

  // OTP input for starting ride
  const [otpInput, setOtpInput] = useState('');

  const startRide = async () => {
    if (!currentRide || !currentRide._id) return alert('No active booking');
    const otpToSend = otpInput?.toString().trim();
    if (!otpToSend || otpToSend.length < 4) return alert('Enter a valid OTP');
    try {
      const res = await api.patch(`/bookings/${currentRide._id}/verify-otp`, { otp: otpToSend });
      const updated = res.data.booking || res.data;
      setCurrentRide(updated);
      setHasActiveRide(true);
      setOtpInput(''); // Clear OTP input after successful verification
      toast({ title: 'Ride started', description: 'OTP verified and ride started' });
    } catch (err: any) {
      console.error('Start ride failed', err?.response?.status, err?.response?.data || err);
      const errorMessage = err?.response?.data?.message || err?.message || 'OTP verification failed';

      if (errorMessage.includes('expired')) {
        alert('OTP has expired. Please ask the rider for a new OTP or contact support.');
      } else if (errorMessage.includes('Invalid OTP')) {
        alert('Invalid OTP. Please check the OTP with the rider.');
      } else {
        alert(errorMessage);
      }
    }
  };

  const regenerateOtp = async () => {
    if (!currentRide || !currentRide._id) return alert('No active booking');
    try {
      const res = await api.patch(`/bookings/${currentRide._id}/regenerate-otp`);
      const updated = res.data.booking || res.data;
      setCurrentRide(updated);
      toast({ title: 'OTP Regenerated', description: 'A new OTP has been sent to the rider' });
    } catch (err: any) {
      console.error('Regenerate OTP failed', err?.response?.status, err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || 'Failed to regenerate OTP');
    }
  };

  // Listen to booking events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onRideStarted = (p: any) => {
      if (!p?.bookingId) return;
      if (currentRide && String(currentRide._id) === String(p.bookingId)) {
        setCurrentRide((c:any) => ({ ...c, status: 'started', startedAt: p.startedAt }));
        toast({ title: 'Ride started', description: 'Passenger verified and ride started' });
      }
    };

    socket.on('ride:started', onRideStarted);

    return () => {
      socket.off('ride:started', onRideStarted);
    };
  }, [currentRide]);

  // pending incoming requests
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [modalRequest, setModalRequest] = useState<RideRequest | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // refs for geolocation watch
  const watchIdRef = useRef<number | null>(null);

  // socket ref
  const socketRef = useRef<any | null>(null);

  // toasts (must be used at top level)
  const { toast } = useToast();

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // helper to fetch dashboard via api (implementation with enhanced logging is declared below)

  const navigate = useNavigate();

  // ✅ On mount: ensure auth, fetch dashboard and get current location
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Driver token:', token);

    if (!token) {
      // Not logged in — redirect to login page
      console.warn('Driver not authenticated, redirecting to /auth');
      localStorage.removeItem('user');
      navigate('/auth');
      return;
    }

    fetchDashboard();

    // 🚗 Get driver's live location when dashboard opens
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lng: longitude, lat: latitude });
          setDriverMarkerPosition([longitude, latitude]);
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, duration:1000, });
          }
        },
        (err) => {
          console.warn("Geolocation error:", err);
        },
        { enableHighAccuracy: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // improve error logging for dashboard fetch
  const fetchDashboard = async () => {
    try {
      const res = await api.get("/bookings/driver/dashboard");
      const data = res.data;
      const driverOnline = data.driver?.isOnline ?? true;
      setIsOnline(driverOnline);
      isOnlineRef.current = driverOnline;
      if (!driverOnline) {
        setPendingRequests([]);
      }
      if (data.driver?.location?.coordinates) {
        setLocation({
          lng: data.driver.location.coordinates[0],
          lat: data.driver.location.coordinates[1],
        });
        setDriverMarkerPosition([data.driver.location.coordinates[0], data.driver.location.coordinates[1]]);
      }
      if (!data.activeRide) {
        setCurrentRide(null);
        setHasActiveRide(false);
        setRouteGeoJSON(null);
        setRiderLiveLocation(null);
        setIsNavigating(false);
        setOtpInput('');
      } else {
        setCurrentRide(data.activeRide);
        setHasActiveRide(true);
        if (data.activeRide.pickup?.location?.coordinates && data.activeRide.destination?.location?.coordinates) {
          const pickupCoords = data.activeRide.pickup.location.coordinates;
          const destCoords = data.activeRide.destination.location.coordinates;
          fetchAndSetRoute(pickupCoords, destCoords);
        }
      }
      setTodayStats(data.todayStats ?? todayStats);
      setWeeklyStats(data.weeklyStats ?? []);
    } catch (err: any) {
      console.error('fetchDashboard error', err?.response?.status, err?.response?.data, err?.message);

      // If authorization error, clear auth and redirect to login
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 401 && (msg === 'No token provided' || msg === 'Invalid token' || msg === 'User not found')) {
        console.warn('Driver auth missing/invalid — clearing token and redirecting to /auth');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
      }
    }
  };

  // initialize socket and listeners
  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    if (!socket) return;

    // Join drivers room
    socket.on("connect", () => {
      console.log("Driver socket connected:", socket.id);
      socket.emit("driver:join", { isOnline: isOnlineRef.current });
      // ensure dashboard is up-to-date in case we missed any events while disconnected
      try { fetchDashboard(); } catch (e) { console.warn('fetchDashboard on socket connect failed', e); }
    });

    // Listen for ride requests (server emits 'ride:request' to drivers room)

    const onRideRequest = (payload: any) => {
      if (!isOnlineRef.current) {
        console.log("Ignoring ride request because driver is OFFLINE:", payload);
        return;
      }
      console.log("Incoming ride request:", payload);
      const normalized: RideRequest = {
        bookingId: payload.bookingId,
        riderId: payload.rider?.id || payload.riderId,
        riderInfo: payload.rider || null,
        pickup: payload.pickup,
        destination: payload.destination,
        fare: payload.fare,
      };
      setPendingRequests((prev) => {
        // avoid duplicates
        if (prev.some((r) => r.bookingId === normalized.bookingId)) return prev;
        // show an in-app toast to driver
        try {
          toast({
            title: 'New ride request',
            description: `${normalized.riderInfo?.name || 'A rider'} requested a ride (${normalized.fare ? '₹' + (normalized.fare/100) : 'fare unknown'})`,
          });
        } catch (e) {}
        return [normalized, ...prev];
      });
    };
    socket.on("ride:request", onRideRequest);

    // Listen for rider location updates (booking-scoped)
    const onRiderLocation = (p: any) => {
      // { riderId, lng, lat }
      console.log('Driver: received rider:location', p);
      if (!p?.lng || !p?.lat) return;
      setRiderLiveLocation([p.lng, p.lat]);
    };
    socket.on("rider:location", onRiderLocation);
    socket.on("driver:location", (p: any) => {
      // server may forward driver locations into booking room; update driver marker
      if (!p || typeof p.lng !== 'number' || typeof p.lat !== 'number') return;
      setDriverMarkerPosition([p.lng, p.lat]);
      // if navigating, check proximity to current step to advance
      if (isNavigating && routeSteps && routeSteps.length > 0) {
        const step = routeSteps[currentNavStep];
        if (step && step.location) {
          const dx = p.lng - step.location[0];
          const dy = p.lat - step.location[1];
          const dist = Math.sqrt(dx*dx + dy*dy);
          // threshold small — if within ~30 meters advance
          if (dist < 0.0003 && currentNavStep < routeSteps.length - 1) {
            setCurrentNavStep((s) => s + 1);
          }
        }
      }
    });

    // Listen for ride confirmed events
    const onRideConfirmed = (payload: any) => {
      console.log("ride:confirmed:", payload);
      // If this driver accepted and got confirmed, update currentRide
      if (payload?.driverId) {
        // refresh dashboard
        fetchDashboard();
      }
    };
    socket.on("ride:confirmed", onRideConfirmed);

    // Handle rider cancellation: clear active ride UI and notify driver
    const onBookingCancelled = (payload: any) => {
      try {
        console.log('Driver: booking cancelled / cleared received:', payload);
        setCurrentRide(null);
        setHasActiveRide(false);
        setRouteGeoJSON(null);
        setRiderLiveLocation(null);
        setIsNavigating(false);
        setOtpInput('');
        setPendingRequests((prev) =>
          prev.filter((r) => !payload?.bookingId || String(r.bookingId) !== String(payload.bookingId))
        );
        toast({
          title: 'Ride Cancelled',
          description: 'The rider has cancelled this ride request.',
        });
        try {
          fetchDashboard();
        } catch (e) {
          console.warn('fetchDashboard after cancellation failed', e);
        }
      } catch (e) {}
    };

    socket.on('driver:booking-cleared', onBookingCancelled);
    socket.on('booking:cancelled', onBookingCancelled);

    return () => {
      socket.off("connect");
      socket.off("ride:request", onRideRequest);
      socket.off("rider:location", onRiderLocation);
      socket.off("ride:confirmed", onRideConfirmed);
      socket.off('driver:booking-cleared', onBookingCancelled);
      socket.off('booking:cancelled', onBookingCancelled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // watch position and send driver:location to server (always when online, and include bookingId if active)
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    // start watching position
    const success = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lng: longitude } as any);
      setDriverMarkerPosition([longitude, latitude]);

      const socket = getSocket();
      if (socket && socket.connected) {
        // if there's an active booking, include bookingId to forward to booking room
        const bookingId = currentRide?._id || (currentRide?.bookingId ?? null);
        socket.emit("driver:location", {
          lng: longitude,
          lat: latitude,
          bookingId: bookingId || undefined,
        });
      }

      // also update driver location via REST API as backup
      (async () => {
        try {
          await api.patch("/driver/location", { lng: longitude, lat: latitude });
        } catch (err) {
          // ignore
        }
      })();
    };

    const error = (err: GeolocationPositionError) => {
      console.warn("Geolocation watch error", err);
    };

    const id = navigator.geolocation.watchPosition(success, error, { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }) as unknown as number;
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRide]); // re-run if currentRide changes (so bookingId will be included)

  // Helper: accept an incoming request
  const computeDistanceKm = (a?: [number, number], b?: [number, number]) => {
    if (!a || !b) return null;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const [lng1, lat1] = a;
    const [lng2, lat2] = b;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const rLat1 = toRad(lat1);
    const rLat2 = toRad(lat2);
    const sinDlat = Math.sin(dLat/2);
    const sinDlon = Math.sin(dLon/2);
    const aHarv = sinDlat*sinDlat + sinDlon*sinDlon * Math.cos(rLat1) * Math.cos(rLat2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1-aHarv));
    return R * c;
  };

  const acceptRequest = async (req: RideRequest) => {
    try {
      // join booking room *before* accepting so we don't miss server-side booking room broadcasts
      const socket = getSocket() || initSocket();
      try { socket.emit("join:booking", { bookingId: req.bookingId }); } catch (e) { console.warn('join booking before accept failed', e); }

      // Call server to accept booking (will assign driver server-side and notify rider)
      const res = await api.patch(`/bookings/${req.bookingId}/accept`);
      const booking = res.data.booking;

      // move this request into active/current ride state
      const active = {
        _id: booking._id,
        rider: req.riderInfo || { _id: req.riderId },
        pickup: booking.pickup || req.pickup || null,
        destination: booking.destination || req.destination || null,
        fare: booking.fare || req.fare || null,
        bookingId: booking._id,
        status: booking.status, // ensure UI knows it's 'accepted' and shows OTP input
      } as any;

      setCurrentRide(active);
      setHasActiveRide(true);

      // refresh dashboard state to pick up any server-side updates (e.g., currentBooking on driver model)
      try { fetchDashboard(); } catch (e) { console.warn('fetchDashboard after accept failed', e); }

      // remove from pending
      setPendingRequests((prev) => prev.filter((p) => p.bookingId !== req.bookingId));

      // show acceptance toast with fare
      try {
        const amt = booking.fare ? (booking.fare / 100).toFixed(2) : null;
        toast({ title: 'Ride accepted', description: `Go to rider — Fare ${amt ? '₹' + amt : 'TBD'}` });
      } catch (e) {}

      // if pickup/destination coords available, fetch route
      const pickupCoords = active.pickup?.location?.coordinates;
      const destCoords = active.destination?.location?.coordinates;
      if (pickupCoords && destCoords) {
        await fetchAndSetRoute(pickupCoords, destCoords);
        setIsNavigating(true); // show navigation UI after accept
        try {
          if (mapRef.current) {
            const [lng1, lat1] = pickupCoords;
            const [lng2, lat2] = destCoords;
            const bounds = [
              [Math.min(lng1, lng2), Math.min(lat1, lat2)],
              [Math.max(lng1, lng2), Math.max(lat1, lat2)],
            ];
            mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
          }
        } catch (err) {}
      }

      return booking;
    } catch (err: any) {
      console.error("Accept request failed", err);
      alert(err?.response?.data?.message || "Failed to accept booking");
      throw err;
    }
  };

  // helper: fetch route from mapbox directions and set geojson
  const fetchAndSetRoute = async (pickupCoords: [number, number], destCoords: [number, number]) => {
    if (!pickupCoords || !destCoords || !MAPBOX_TOKEN) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteGeoJSON({
          type: "Feature",
          geometry: route.geometry,
        });

        // extract step-by-step instructions
        try {
          const legs = route.legs || [];
          const steps: any[] = [];
          legs.forEach((leg: any) => {
            (leg.steps || []).forEach((s: any) => {
              steps.push({
                instruction: s.maneuver?.instruction || s.name || '',
                location: s.maneuver?.location || null,
                distance: s.distance,
                duration: s.duration,
              });
            });
          });
          setRouteSteps(steps);
        } catch (err) {
          setRouteSteps([]);
        }
      }
    } catch (err) {
      console.error("Error fetching route:", err);
    }
  };

  // Toggle online/offline
  const handleToggleOnline = async () => {
    try {
      const res = await api.patch("/driver/status");
      const data = res.data;
      const newStatus = Boolean(data.isOnline);
      setIsOnline(newStatus);
      isOnlineRef.current = newStatus;

      const socket = socketRef.current;
      if (socket) {
        socket.emit("driver:status", { isOnline: newStatus });
      }

      if (!newStatus) {
        setPendingRequests([]);
        setAcceptModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Complete ride
  const handleCompleteRide = async () => {
    if (!currentRide) return;
    // Only allow completion after ride has been started (OTP verified)
    if (currentRide?.status !== 'started') {
      alert('You must start the ride (verify OTP) before completing it.');
      return;
    }
    try {
      const res = await api.patch(`/bookings/${currentRide._id}/complete`);
      if (res.status === 200) {
        setHasActiveRide(false);
        setCurrentRide(null);
        setRouteGeoJSON(null);
        setRiderLiveLocation(null);
        fetchDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start in-app navigation (use Mapbox steps)
  const handleStartNavigation = () => {
    if (!routeSteps || routeSteps.length === 0) {
      alert('No route available');
      return;
    }
    setIsNavigating(true);
    setCurrentNavStep(0);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setCurrentNavStep(0);
  };

  // Open Google Maps directions in a new tab (prefers current driver location if available)
  const handleOpenGoogleMaps = () => {
    if (!currentRide) return alert('No active ride');
    const pickup = currentRide.pickup?.location?.coordinates;
    const dest = currentRide.destination?.location?.coordinates;
    if (!pickup || !dest) return alert('Missing pickup or destination coordinates');

    // coords are stored as [lng, lat]
    let originLatLng = '';
    if (driverMarkerPosition && driverMarkerPosition.length === 2) {
      originLatLng = `${driverMarkerPosition[1]},${driverMarkerPosition[0]}`; // lat,lng
    } else {
      originLatLng = `${pickup[1]},${pickup[0]}`;
    }

    const destLatLng = `${dest[1]},${dest[0]}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originLatLng)}&destination=${encodeURIComponent(destLatLng)}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const confirmAccept = async () => {
    if (!modalRequest) return;
    setAccepting(true);
    try {
      await acceptRequest(modalRequest);
      setAccepted(true);
      setAccepting(false);
      // Keep accepted state briefly to show animation, then close
      setTimeout(() => {
        setAcceptModalOpen(false);
        setAccepted(false);
        setModalRequest(null);
      }, 1200);
    } catch (err) {
      setAccepting(false);
      alert('Failed to accept booking');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FF] text-[#11152F] flex flex-col md:flex-row h-screen overflow-hidden">
      {/* ══════════════════════════════════════════════════════
          SCREEN 9: DRIVER LEFT SIDEBAR
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
          <span className="text-[10px] bg-purple-50 text-purple-600 border border-purple-200 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Driver Hub
          </span>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, onClick: () => setActiveDriverTab("dashboard") },
            { id: "requests", label: "Ride Requests", icon: Bell, badge: pendingRequests.length, onClick: () => setActiveDriverTab("requests") },
            { id: "history", label: "My Rides", icon: Clock, onClick: () => setHistoryModalOpen(true) },
            { id: "earnings", label: "Earnings", icon: TrendingUp, onClick: () => setActiveDriverTab("earnings") },
            { id: "wallet", label: "Wallet", icon: Wallet, onClick: () => setActiveDriverTab("wallet") },
            { id: "support", label: "Support", icon: Headphones, onClick: () => {
              const el = document.getElementById("open-copilot");
              if (el) el.click();
              else toast({ title: "AI Driver Support", description: "Use the AI chatbot at the bottom right!" });
            }},
            { id: "profile", label: "Profile", icon: User, onClick: () => setProfileModalOpen(true) },
          ].map((item) => {
            const isActive = activeDriverTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-[#EAEFFF] text-[#304BFF] shadow-xs"
                    : "text-[#536184] hover:bg-[#F5F8FF] hover:text-[#11152F]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#304BFF]" : "text-[#536184]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Driver Profile Summary at Bottom */}
        <div className="p-4 border-t border-[#E4EAF6] bg-[#F5F8FF]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0" onClick={() => setProfileModalOpen(true)}>
              <div className="w-9 h-9 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "D"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#11152F] truncate">
                  {currentUser?.name || "Rahul Sharma"}
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified Driver
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
          MAIN CONTENT AREA (SCREENS 9 & 10)
      ══════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F5F8FF]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#E4EAF6] px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-black text-[#11152F]">
              Good Morning, {currentUser?.name ? currentUser.name.split(" ")[0] : "Rahul"}!
            </h1>
            <p className="text-xs text-[#536184]">
              {isOnline ? "Stay online to receive ride requests" : "You are currently offline"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Online / Offline Switch with Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#E4EAF6] bg-[#F5F8FF]">
              <span className={`text-xs font-bold flex items-center gap-1.5 ${isOnline ? "text-[#16B86A]" : "text-[#536184]"}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#16B86A] animate-pulse" : "bg-slate-400"}`} />
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch checked={isOnline} onCheckedChange={handleToggleOnline} />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="border-[#E4EAF6] text-[#536184] hover:bg-[#F5F8FF] text-xs h-9"
              onClick={() => setHistoryModalOpen(true)}
            >
              <History className="w-3.5 h-3.5 mr-1.5 text-[#304BFF]" /> Trips
            </Button>

            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#EAEFFF] border border-[#304BFF]/30 flex items-center justify-center text-[#304BFF] font-bold text-sm"
            >
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "R"}
            </button>
          </div>
        </header>

        {/* ── STATS ROW (Screen 9 in Reference) ── */}
        <div className="p-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Today's Rides */}
            <div className="p-4 bg-white rounded-2xl border border-[#E4EAF6] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAEFFF] flex items-center justify-center text-[#304BFF]">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#11152F]">{todayStats.rides || 12}</p>
                <p className="text-xs text-[#536184]">Today's Rides</p>
              </div>
            </div>

            {/* Card 2: Today's Earnings */}
            <div className="p-4 bg-white rounded-2xl border border-[#E4EAF6] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#304BFF]">
                  ₹{todayStats.earnings ? (todayStats.earnings / 100).toFixed(0) : "1,850"}
                </p>
                <p className="text-xs text-[#536184]">Today's Earnings</p>
              </div>
            </div>

            {/* Card 3: Rating */}
            <div className="p-4 bg-white rounded-2xl border border-[#E4EAF6] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Star className="w-6 h-6 fill-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#11152F]">{todayStats.rating || 4.8}</p>
                <p className="text-xs text-[#536184]">Rating</p>
              </div>
            </div>

            {/* Card 4: Acceptance Rate */}
            <div className="p-4 bg-white rounded-2xl border border-[#E4EAF6] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#16B86A]">92%</p>
                <p className="text-xs text-[#536184]">Acceptance</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── SPLIT VIEW: INCOMING REQUESTS / ACTIVE RIDE & MAP ── */}
        <div className="flex-1 flex flex-col md:flex-row px-6 pb-6 gap-6 overflow-hidden">

          {/* LEFT PANEL: Requests or Active Ride */}
          <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col gap-4 overflow-y-auto">

            {/* SCREEN 10: ACTIVE RIDE PANEL */}
            {hasActiveRide && currentRide ? (
              <div className="bg-white rounded-3xl border border-[#E4EAF6] shadow-md p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#E4EAF6] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <h3 className="font-black text-sm text-[#11152F]">Active Ride</h3>
                  </div>
                  <span className="text-xs font-mono text-[#536184] bg-[#F5F8FF] px-2 py-0.5 rounded-md">
                    12:35
                  </span>
                </div>

                {/* OTP Display Pill (Screen 10 in Reference) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EAEFFF] to-[#F5F8FF] border border-[#304BFF]/30 text-center space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#536184]">
                    OTP from Rider
                  </p>
                  <div className="font-mono text-3xl font-black text-[#304BFF] tracking-[0.4em]">
                    4 2 8 1
                  </div>
                </div>

                {/* Rider Info Card */}
                <div className="p-3.5 rounded-2xl border border-[#E4EAF6] bg-[#F5F8FF] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#304BFF] text-white flex items-center justify-center font-bold text-sm">
                      {currentRide.rider?.name ? currentRide.rider.name.charAt(0) : "P"}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#11152F]">{currentRide.rider?.name || "Priya Sharma"}</p>
                      <p className="text-[10px] text-[#536184] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        4.9 (182 rides)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert("Calling rider...")}
                      className="w-8 h-8 rounded-full bg-white border border-[#E4EAF6] flex items-center justify-center text-[#304BFF] hover:bg-[#EAEFFF]"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        const el = document.getElementById("open-copilot");
                        if (el) el.click();
                      }}
                      className="w-8 h-8 rounded-full bg-white border border-[#E4EAF6] flex items-center justify-center text-[#304BFF] hover:bg-[#EAEFFF]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Trip Route Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[#11152F]">{currentRide.pickup?.address || "Connaught Place"}</p>
                      <p className="text-[10px] text-[#536184]">Pickup • 3 min</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-[#11152F]">{currentRide.destination?.address || "India Gate"}</p>
                      <p className="text-[10px] text-[#536184]">Drop • 12 min</p>
                    </div>
                  </div>
                </div>

                {/* OTP Verification Input if ride not started yet */}
                {currentRide.status === "accepted" && (
                  <div className="pt-2 border-t border-[#E4EAF6] space-y-2">
                    <label className="text-xs font-bold text-[#11152F]">Enter Rider OTP to Start</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter 4 or 6-digit OTP"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        className="bg-[#F5F8FF] border-[#E4EAF6] text-xs h-10"
                      />
                      <Button
                        onClick={startRide}
                        className="bg-[#304BFF] hover:bg-[#2538e0] text-white text-xs h-10 px-4 font-bold"
                      >
                        Verify
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Navigate (Blue) & Complete Ride (Green) */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={isNavigating ? handleStopNavigation : handleStartNavigation}
                    className="h-11 bg-[#304BFF] hover:bg-[#2438d0] text-white font-bold text-xs rounded-xl"
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    {isNavigating ? "Stop Nav" : "Navigate"}
                  </Button>
                  <Button
                    onClick={handleCompleteRide}
                    className="h-11 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Complete Ride
                  </Button>
                </div>
              </div>
            ) : null}

            {/* SCREEN 9: INCOMING REQUESTS PANEL */}
            <div className="bg-white rounded-3xl border border-[#E4EAF6] shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-[#11152F]">Incoming Requests</h3>
                <span className="text-[11px] bg-[#EAEFFF] text-[#304BFF] font-bold px-2 py-0.5 rounded-full">
                  {pendingRequests.length} Available
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                /* Fallback cards when no live requests, showing reference requests */
                <div className="space-y-3">
                  {[
                    { id: "mock1", from: "Connaught Place", to: "India Gate", fare: "₹185", dist: "2.5 km", time: "3 min" },
                    { id: "mock2", from: "Karol Bagh", to: "Rajiv Chowk", fare: "₹120", dist: "1.8 km", time: "2 min" },
                  ].map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-[#E4EAF6] bg-[#F5F8FF] hover:border-[#304BFF]/40 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span className="font-bold text-xs text-[#11152F] truncate">{req.from}</span>
                          <ArrowRight className="w-3 h-3 text-[#536184]" />
                          <span className="font-bold text-xs text-[#11152F] truncate">{req.to}</span>
                        </div>
                        <span className="font-black text-sm text-[#304BFF]">{req.fare}</span>
                      </div>
                      <p className="text-[10px] text-[#536184]">⏱ {req.dist} • {req.time} away</p>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-[#E4EAF6] text-[#536184] hover:bg-white"
                          onClick={() => toast({ title: "Request Declined" })}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-[#304BFF] hover:bg-[#2538e0] text-white font-bold"
                          onClick={() => {
                            setModalRequest({
                              bookingId: req.id,
                              fare: 18500,
                              pickup: { address: req.from },
                              destination: { address: req.to },
                              riderInfo: { name: "Rider" },
                            });
                            setAcceptModalOpen(true);
                          }}
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Live Pending Requests */
                <div className="space-y-3">
                  {pendingRequests.map((req) => {
                    const pickupCoords = req.pickup?.location?.coordinates as [number, number] | undefined;
                    const distKm = computeDistanceKm(driverMarkerPosition as any, pickupCoords as any);
                    const etaMin = distKm ? Math.max(1, Math.round((distKm / 40) * 60)) : 3;
                    return (
                      <div
                        key={req.bookingId}
                        className="p-4 rounded-2xl border border-[#E4EAF6] bg-white shadow-xs hover:border-[#304BFF] transition space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xs text-[#11152F]">{req.riderInfo?.name || "Rider"}</p>
                          <span className="text-sm font-black text-[#304BFF]">
                            ₹{req.fare ? (req.fare / 100).toFixed(0) : "150"}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-[#536184]">
                          <p className="truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                            {req.pickup?.address || "Pickup"}
                          </p>
                          <p className="truncate flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444] shrink-0" />
                            {req.destination?.address || "Destination"}
                          </p>
                          {distKm && (
                            <p className="text-[11px] font-semibold text-[#304BFF]">
                              ⏱ {distKm.toFixed(1)} km • {etaMin} min away
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs border-[#E4EAF6] text-[#536184] hover:bg-[#F5F8FF]"
                            onClick={() => setPendingRequests((p) => p.filter((x) => x.bookingId !== req.bookingId))}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-[#304BFF] hover:bg-[#2538e0] text-white font-bold"
                            onClick={() => {
                              setModalRequest(req);
                              setAcceptModalOpen(true);
                            }}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: MAP (Screen 9 in Reference) */}
          <div className="flex-1 rounded-3xl overflow-hidden border border-[#E4EAF6] shadow-xs relative bg-white min-h-[350px]">
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{
                longitude: driverMarkerPosition?.[0] ?? 77.209,
                latitude: driverMarkerPosition?.[1] ?? 28.6139,
                zoom: 12,
              }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/streets-v12"
            >
              {/* Driver marker */}
              {driverMarkerPosition && (
                <Marker longitude={driverMarkerPosition[0]} latitude={driverMarkerPosition[1]}>
                  <div className="text-3xl animate-pulse filter drop-shadow-md">🚗</div>
                </Marker>
              )}

              {/* Rider live marker */}
              {riderLiveLocation && (
                <Marker longitude={riderLiveLocation[0]} latitude={riderLiveLocation[1]}>
                  <div className="text-2xl">🧍</div>
                </Marker>
              )}

              {/* Pending request pickup markers */}
              {pendingRequests.map((r) => {
                const coords = r.pickup?.location?.coordinates;
                if (!coords) return null;
                return (
                  <Marker key={r.bookingId} longitude={coords[0]} latitude={coords[1]}>
                    <div title={`Pickup: ${r.pickup?.address || ""}`} className="text-2xl">📍</div>
                  </Marker>
                );
              })}

              {/* Route polyline */}
              {routeGeoJSON && (
                <Source id="route" type="geojson" data={routeGeoJSON}>
                  <Layer
                    id="route-line"
                    type="line"
                    paint={{ "line-color": "#304BFF", "line-width": 5 }}
                  />
                </Source>
              )}
            </Map>

            {/* "Your Location" floating pill */}
            <div className="absolute bottom-5 left-5 bg-white/95 backdrop-blur-md border border-[#E4EAF6] rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
              <span className="text-xs font-bold text-[#11152F]">Your Location</span>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════
          ACCEPT RIDE MODAL
      ══════════════════════════════════════════════════════ */}
      <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
        <DialogContent className="bg-white text-[#11152F] border border-[#E4EAF6] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[#11152F]">Accept Ride Request?</DialogTitle>
            <DialogDescription className="text-[#536184]">
              Confirm accepting this ride. {modalRequest?.riderInfo?.name || "Rider"} will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-4 rounded-2xl bg-[#F5F8FF] border border-[#E4EAF6]">
              <p className="text-sm font-bold text-[#11152F]">{modalRequest?.riderInfo?.name || "Rider"}</p>
              <div className="mt-2 space-y-1.5 text-xs text-[#536184]">
                <p className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" /> {modalRequest?.pickup?.address || "Pickup location"}
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> {modalRequest?.destination?.address || "Destination"}
                </p>
              </div>
              <p className="text-lg font-black text-[#304BFF] mt-3">
                Fare: ₹{modalRequest?.fare ? (modalRequest.fare / 100).toFixed(0) : "185"}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-[#E4EAF6] text-[#536184]" onClick={() => setAcceptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className={`bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white font-bold hover:opacity-90 ${accepting ? "opacity-70" : ""}`}
              onClick={confirmAccept}
              disabled={accepting}
            >
              {accepting ? "Accepting..." : "Accept Ride"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        initialUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          fetchDashboard();
        }}
      />

      {/* Ride History Modal */}
      <RideHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        userRole="driver"
      />

      {/* AI Support Copilot */}
      <CopilotChat />
    </div>
  );
};

export default DriverDashboard;
