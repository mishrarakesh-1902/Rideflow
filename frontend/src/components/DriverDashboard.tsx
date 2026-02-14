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
} from "lucide-react";
import api from "@/services/api";
import { initSocket, getSocket } from "@/services/socket";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type RideRequest = {
  bookingId: string;
  riderId?: string;
  pickup?: any;
  destination?: any;
  fare?: number;
  riderInfo?: any;
};

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
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
      toast({ title: 'Ride started', description: 'OTP verified and ride started' });
    } catch (err: any) {
      console.error('Start ride failed', err?.response?.status, err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || 'OTP verification failed');
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
      console.warn('Driver not authenticated, redirecting to login');
      localStorage.removeItem('user');
      navigate('/');
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
      setIsOnline(data.driver?.isOnline ?? true);
      if (data.driver?.location?.coordinates) {
        setLocation({
          lng: data.driver.location.coordinates[0],
          lat: data.driver.location.coordinates[1],
        });
        setDriverMarkerPosition([data.driver.location.coordinates[0], data.driver.location.coordinates[1]]);
      }
      setCurrentRide(data.activeRide);
      setHasActiveRide(!!data.activeRide);
      setTodayStats(data.todayStats ?? todayStats);
      setWeeklyStats(data.weeklyStats ?? []);
      if (data.activeRide && data.activeRide.pickup?.location?.coordinates && data.activeRide.destination?.location?.coordinates) {
        const pickupCoords = data.activeRide.pickup.location.coordinates;
        const destCoords = data.activeRide.destination.location.coordinates;
        fetchAndSetRoute(pickupCoords, destCoords);
      }
    } catch (err: any) {
      console.error('fetchDashboard error', err?.response?.status, err?.response?.data, err?.message);

      // If authorization error, clear auth and redirect to login
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 401 && (msg === 'No token provided' || msg === 'Invalid token' || msg === 'User not found')) {
        console.warn('Driver auth missing/invalid — clearing token and redirecting');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
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
      socket.emit("driver:join");
      // ensure dashboard is up-to-date in case we missed any events while disconnected
      try { fetchDashboard(); } catch (e) { console.warn('fetchDashboard on socket connect failed', e); }
    });

    // Listen for ride requests (server emits 'ride:request' to drivers room)

    const onRideRequest = (payload: any) => {
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

    // Silent refresh when rider cancels — do not show cancellation UI, just refresh dashboard quietly
    const onDriverBookingCleared = (payload: any) => {
      try {
        console.log('driver:booking-cleared received', payload);
        // If this pertains to our current ride, clear local active ride UI and refresh quietly
        if (payload?.bookingId) {
          setCurrentRide(null);
          setHasActiveRide(false);
          setRouteGeoJSON(null);
          setRiderLiveLocation(null);
          // quietly refresh dashboard state
          try { fetchDashboard(); } catch (e) { console.warn('fetchDashboard after driver:booking-cleared failed', e); }
        }
      } catch (e) {}
    };
    socket.on('driver:booking-cleared', onDriverBookingCleared);

    return () => {
      socket.off("connect");
      socket.off("ride:request", onRideRequest);
      socket.off("rider:location", onRiderLocation);
      socket.off("ride:confirmed", onRideConfirmed);
      socket.off('driver:booking-cleared', onDriverBookingCleared);
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
      setIsOnline(data.isOnline);
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

  // Render
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
              <h1 className="text-xl font-bold text-gradient">Driver Hub</h1>
              <p className="text-sm text-muted-foreground">Welcome back, driver!</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${isOnline ? "text-success" : "text-muted-foreground"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>              {hasActiveRide && (
                <span className="ml-2 text-sm text-amber-500 font-medium">On Ride</span>
              )}              <Switch checked={isOnline} onCheckedChange={handleToggleOnline} />
            </div>
            <div className="relative">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              {pendingRequests.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {pendingRequests.length}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* the rest of UI unmodified */}
        {isOnline && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <div className="w-3 h-3 bg-success rounded-full mr-2 animate-pulse"></div>
                  You're Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Car className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-glow" />
                  {hasActiveRide ? (
                    <>
                      <p className="text-lg font-medium mb-2">Active Ride</p>
                      <p className="text-muted-foreground">Driving to destination</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium mb-2">Looking for Rides</p>
                      <p className="text-muted-foreground">Stay tuned for ride requests</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {hasActiveRide && currentRide && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Current Ride</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{currentRide.rider?.name || "Rider"}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-500 mr-1" />
                          {currentRide.rider?.rating || 5}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-medium">{currentRide.pickup?.address || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-medium">{currentRide.destination?.address || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">{currentRide.distanceKm ?? "-" } km</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ETA:</span>
                      <span className="font-medium">{currentRide.estimatedTimeMin ?? "-"} min</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium">Fare:</span>
                      <span className="text-2xl font-bold text-gradient">{currentRide.fare ? `₹${(currentRide.fare/100).toFixed(2)}` : "-"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Button variant="outline" onClick={isNavigating ? handleStopNavigation : handleStartNavigation}>
                        <Navigation className="w-4 h-4 mr-2" />
                        {isNavigating ? 'Stop' : 'Start'}
                      </Button>

                      <Button variant="outline" onClick={handleOpenGoogleMaps}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Open in Google Maps
                      </Button>

                      <Button className="btn-gradient" onClick={handleCompleteRide} disabled={currentRide?.status !== 'started'}>
                        Complete Ride
                      </Button>
                    </div>

                    {/* OTP verification (driver enters OTP shown to rider) */}
                    {currentRide?.status === 'accepted' && (
                      <div className="mt-4">
                        <div className="flex items-center space-x-2">
                          <Input placeholder="Enter OTP" value={otpInput} onChange={(e) => setOtpInput((e.target as HTMLInputElement).value)} />
                        <Button className="btn-gradient" onClick={startRide} disabled={(otpInput || '').trim().length !== 6}>Start Ride</Button>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">Enter the rider's OTP and click <strong>Start Ride</strong> to enable completing the ride.</div>
                      </div>
                    )}

                    {/* In-app navigation steps */}
                    {isNavigating && routeSteps && routeSteps.length > 0 && (
                      <div className="mt-3 p-3 bg-muted rounded-md max-h-48 overflow-auto">
                        <div className="text-sm text-muted-foreground mb-2">Navigation</div>
                        <ol className="list-decimal list-inside space-y-2">
                          {routeSteps.map((s, i) => (
                            <li key={i} className={`${i === currentNavStep ? 'font-medium text-primary' : 'text-sm text-muted-foreground'}`}>
                              {s.instruction} <span className="text-xs text-muted-foreground">• {(s.distance/1000).toFixed(2)} km • {Math.round(s.duration/60)} min</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Incoming requests panel */}
        {pendingRequests.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Incoming Ride Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const pickupCoords = req.pickup?.location?.coordinates as [number, number] | undefined;
                  const distKm = computeDistanceKm(driverMarkerPosition as any, pickupCoords as any);
                  const etaMin = distKm ? Math.max(1, Math.round((distKm / 40) * 60)) : null; // assume 40 km/h avg
                  return (
                  <div key={req.bookingId} className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <div className="font-medium">{req.riderInfo?.name || 'Rider'}</div>
                      <div className="text-sm text-muted-foreground">Pickup: {req.pickup?.address || "—"}</div>
                      <div className="text-sm text-muted-foreground">Drop: {req.destination?.address || "—"}</div>
                      <div className="text-sm mt-1">Fare: {req.fare ? `₹${(req.fare/100).toFixed(2)}` : "-"} {distKm ? <span className="ml-2 text-xs text-muted-foreground">• {distKm.toFixed(1)} km • {etaMin} min</span> : null}</div>
                    </div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setPendingRequests((p) => p.filter((x) => x.bookingId !== req.bookingId))}>
                        Decline
                      </Button>
                      <Button size="sm" className="btn-gradient" onClick={() => { setModalRequest(req); setAcceptModalOpen(true); }}>
                        Accept
                      </Button>
                    </div>
                  </div>
                )})}
              </div>
            </CardContent>

            {/* Accept modal */}
            <Dialog open={acceptModalOpen} onOpenChange={setAcceptModalOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Accept Ride Request</DialogTitle>
                  <DialogDescription>
                    Confirm accepting this ride request. Driver will be assigned and rider will be notified.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  <div className="font-medium">{modalRequest?.riderInfo?.name || 'Unknown Rider'}</div>
                  <div className="text-sm text-muted-foreground">Pickup: {modalRequest?.pickup?.address || '—'}</div>
                  <div className="text-sm text-muted-foreground">Drop: {modalRequest?.destination?.address || '—'}</div>
                </div>

                <DialogFooter>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => setAcceptModalOpen(false)}>Cancel</Button>
                    <Button className={`btn-gradient ${accepting ? 'opacity-80' : ''}`} onClick={confirmAccept} disabled={accepting}>
                      {accepting ? 'Accepting...' : 'Confirm Accept'}
                    </Button>
                  </div>
                </DialogFooter>

                {accepted && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 rounded-full p-6 flex items-center justify-center">
                      <svg className="w-12 h-12 text-success animate-scale-in" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </Card>
        )}

        {/* Today's stats and map area untouched for UI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold text-gradient">₹{(todayStats.earnings/100).toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Today's Earnings</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Car className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{todayStats.rides}</div>
              <div className="text-sm text-muted-foreground">Rides Completed</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary-blue" />
              <div className="text-2xl font-bold">{todayStats.hours}h</div>
              <div className="text-sm text-muted-foreground">Hours Driving</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{todayStats.rating}</div>
              <div className="text-sm text-muted-foreground">Rating</div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <TrendingUp className="w-5 h-5 mr-2 text-success" />
              Weekly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const maxEarn = Math.max(...weeklyStats.map((s) => s.earnings), 1);
                return (
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyStats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-xs text-muted-foreground mb-2">{stat.day}</div>
                        <div className="bg-primary/20 rounded-lg mx-auto relative overflow-hidden" style={{ height: "100px", width: "40px" }}>
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-1000"
                            style={{
                              height: `${(stat.earnings / maxEarn) * 100}%`,
                              background: "var(--gradient-primary)",
                            }}
                          />
                        </div>
                        <div className="text-xs font-medium mt-2">₹{(stat.earnings/100).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Total This Week</div>
                  <div className="text-2xl font-bold text-gradient">₹{(weeklyStats.reduce((sum, day) => sum + day.earnings, 0) / 100).toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Average Per Day</div>
                  <div className="text-xl font-semibold">
                    ₹{((weeklyStats.reduce((sum, day) => sum + day.earnings, 0) / 7) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map area */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="h-80 lg:h-[480px]">
              <Map
                ref={mapRef}
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                  longitude: driverMarkerPosition?.[0] ?? 77.209,
                  latitude: driverMarkerPosition?.[1] ?? 28.6139,
                  zoom: 12,
                }}
                style={{ width: "100%", height: "100%" }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
              >
                {/* Driver marker */}
                {driverMarkerPosition && (
                  <Marker longitude={driverMarkerPosition[0]} latitude={driverMarkerPosition[1]}>
                    <div className="text-2xl">🚗</div>
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
                      <div title={`Pickup: ${r.pickup?.address || ''}`} className="text-2xl">📍</div>
                    </Marker>
                  );
                })}

                {/* Route polyline */}
                {routeGeoJSON && (
                  <Source id="route" type="geojson" data={routeGeoJSON}>
                    <Layer
                      id="route-line"
                      type="line"
                      paint={{
                        "line-color": "#3b82f6",
                        "line-width": 5,
                      }}
                    />
                  </Source>
                )}
              </Map>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;
