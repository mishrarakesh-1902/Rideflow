// src/components/DriverDashboard.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
  const [riderLiveLocation, setRiderLiveLocation] = useState<[number, number] | null>(null);
  const [driverMarkerPosition, setDriverMarkerPosition] = useState<[number, number] | null>(null);

  // pending incoming requests
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);

  // refs for geolocation watch
  const watchIdRef = useRef<number | null>(null);

  // socket ref
  const socketRef = useRef<any | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // helper to fetch dashboard via api
  const fetchDashboard = async () => {
    try {
      const res = await api.get("/driver/dashboard");
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
      // if there's an active ride with coordinates, set up route etc.
      if (data.activeRide && data.activeRide.pickup?.location?.coordinates && data.activeRide.destination?.location?.coordinates) {
        const pickupCoords = data.activeRide.pickup.location.coordinates;
        const destCoords = data.activeRide.destination.location.coordinates;
        fetchAndSetRoute(pickupCoords, destCoords);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ On mount: fetch dashboard and get current location
  useEffect(() => {
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
  }, []);

  // initialize socket and listeners
  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    if (!socket) return;

    // Join drivers room
    socket.on("connect", () => {
      console.log("Driver socket connected:", socket.id);
      socket.emit("driver:join");
    });

    // Listen for ride requests (server emits 'ride:request' to drivers room)
    const onRideRequest = (payload: RideRequest) => {
      console.log("Incoming ride request:", payload);
      setPendingRequests((prev) => {
        // avoid duplicates
        if (prev.some((r) => r.bookingId === payload.bookingId)) return prev;
        return [payload, ...prev];
      });
    };
    socket.on("ride:request", onRideRequest);

    // Listen for rider location updates (booking-scoped)
    const onRiderLocation = (p: any) => {
      // { riderId, lng, lat }
      /////////// console.log("ride:confirmed:", payload);
      if (!p?.lng || !p?.lat) return;
      setRiderLiveLocation([p.lng, p.lat]);
    };
    socket.on("rider:location", onRiderLocation);
    socket.on("driver:location", (p: any) => {
      // server might also forward driver locations into booking room; driver may ignore
      // but keep for debugging
      // console.log("driver:location (forwarded):", p);
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

    return () => {
      socket.off("connect");
      socket.off("ride:request", onRideRequest);
      socket.off("rider:location", onRiderLocation);
      socket.off("ride:confirmed", onRideConfirmed);
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
  const acceptRequest = async (req: RideRequest) => {
    try {
      const socket = getSocket() || initSocket();
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const driverId = user?._id || user?.id || null;

      // inform server that driver accepts; include driverInfo (optional)
      socket.emit("ride:accept", {
        riderId: req.riderId,
        driverId,
        bookingId: req.bookingId,
        driverInfo: {
          name: user?.name,
          phone: (user as any)?.phone,
        },
      });

      // join booking room for receiving rider location updates
      socket.emit("join:booking", { bookingId: req.bookingId });

      // move this request into active/current ride state (optimistic)
      const active = {
        _id: req.bookingId,
        rider: req.riderInfo || { _id: req.riderId },
        pickup: req.pickup || null,
        destination: req.destination || null,
        fare: req.fare || null,
        bookingId: req.bookingId,
      };
      setCurrentRide(active);
      setHasActiveRide(true);

      // remove from pending
      setPendingRequests((prev) => prev.filter((p) => p.bookingId !== req.bookingId));

      // if pickup/destination coords available, fetch route
      const pickupCoords = req.pickup?.location?.coordinates ?? active?.pickup?.location?.coordinates;
      const destCoords = req.destination?.location?.coordinates ?? active?.destination?.location?.coordinates;
      if (pickupCoords && destCoords) {
        await fetchAndSetRoute(pickupCoords, destCoords);
        // fit map to bounds
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
        } catch (err) {
          // ignore fit errors
          
        }
      }

      // join booking room too
      socket.emit("join:booking", { bookingId: req.bookingId });
    } catch (err) {
      console.error("Accept request failed", err);
    }
  };

  // helper: fetch route from mapbox directions and set geojson
  const fetchAndSetRoute = async (pickupCoords: [number, number], destCoords: [number, number]) => {
    if (!pickupCoords || !destCoords || !MAPBOX_TOKEN) return;
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        setRouteGeoJSON({
          type: "Feature",
          geometry: data.routes[0].geometry,
        });
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
    try {
      const res = await api.patch(`/driver/ride/${currentRide._id}/complete`);
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
              </span>
              <Switch checked={isOnline} onCheckedChange={handleToggleOnline} />
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
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
                      <span className="text-2xl font-bold text-gradient">${currentRide.fare ?? "-"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline">
                        <Navigation className="w-4 h-4 mr-2" />
                        Navigate
                      </Button>
                      <Button className="btn-gradient" onClick={handleCompleteRide}>
                        Complete Ride
                      </Button>
                    </div>
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
                {pendingRequests.map((req) => (
                  <div key={req.bookingId} className="flex items-center justify-between p-3 rounded-md border">
                    <div>
                      <div className="font-medium">Pickup: {req.pickup?.address || "—"}</div>
                      <div className="text-sm text-muted-foreground">Drop: {req.destination?.address || "—"}</div>
                      <div className="text-sm mt-1">Fare: ₹{req.fare ?? "-"}</div>
                    </div>
                    <div className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setPendingRequests((p) => p.filter((x) => x.bookingId !== req.bookingId))}>
                        Decline
                      </Button>
                      <Button size="sm" className="btn-gradient" onClick={() => acceptRequest(req)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's stats and map area untouched for UI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold text-gradient">${todayStats.earnings}</div>
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
              <div className="text-sm text-muted-foreground">Hours Online</div>
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
              <div className="grid grid-cols-7 gap-2">
                {weeklyStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">{stat.day}</div>
                    <div className="bg-primary/20 rounded-lg mx-auto relative overflow-hidden" style={{ height: "100px", width: "40px" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-1000"
                        style={{
                          height: `${(stat.earnings / 310) * 100}%`,
                          background: "var(--gradient-primary)",
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium mt-2">${stat.earnings}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Total This Week</div>
                  <div className="text-2xl font-bold text-gradient">${weeklyStats.reduce((sum, day) => sum + day.earnings, 0)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Average Per Day</div>
                  <div className="text-xl font-semibold">
                    ${Math.round(weeklyStats.reduce((sum, day) => sum + day.earnings, 0) / 7)}
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

                {/* Route polyline */}
                {routeGeoJSON && (
                  <Source id="route" type="geojson" data={{ type: "Feature", geometry: routeGeoJSON }}>
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
