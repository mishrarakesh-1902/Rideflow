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
  MessageCircle
} from "lucide-react";
import api from "@/services/api";
import { initSocket, getSocket } from "@/services/socket";

const DriverDashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [todayStats, setTodayStats] = useState({ earnings:0, rides:0, hours:0, rating:5 });
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [location, setLocation] = useState({ lng:0, lat:0 });

  const socketRef = useRef<any>(null);

  // helper to fetch dashboard via api
  const fetchDashboard = async () => {
    try {
      const res = await api.get("/driver/dashboard");
      const data = res.data;
      setIsOnline(data.driver?.isOnline ?? true);
      if (data.driver?.location?.coordinates) {
        setLocation({ lng: data.driver.location.coordinates[0], lat: data.driver.location.coordinates[1] });
      }
      setCurrentRide(data.activeRide);
      setHasActiveRide(!!data.activeRide);
      setTodayStats(data.todayStats ?? todayStats);
      setWeeklyStats(data.weeklyStats ?? []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Socket init + listen to ride requests & rider location
  useEffect(() => {
    const socket = initSocket();
    socketRef.current = socket;

    // Tell server this user is a driver (server should validate token and set driver id)
    socket.emit("driver:join", { });

    socket.on("rideRequest", (ride) => {
      console.log("Incoming ride request", ride);
      // backend could push here - you may show a UI alert; we keep console for now
    });

    socket.on("riderLocation", (payload) => {
      // payload: { riderId, lat, lng }
      console.log("Rider live location:", payload);
      // Optionally update currentRide's rider marker
      if (currentRide && currentRide.rider && payload.riderId === currentRide.rider._id) {
        setCurrentRide((c: any) => ({ ...c, riderLiveLocation: { lat: payload.lat, lng: payload.lng } }));
      }
    });

    socket.on("ride:update", (payload) => {
      console.log("Ride update:", payload);
      // if ride changed then refresh
      fetchDashboard();
    });

    return () => {
      socket.off("rideRequest");
      socket.off("riderLocation");
      socket.off("ride:update");
    };
  }, [currentRide]);

  // Auto send location to backend using socket for real-time
  useEffect(() => {
    if (!navigator.geolocation) return;

    const socket = initSocket();

    const geoSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lng: longitude });

      // send to server via socket for real-time broadcast
      socket.emit("driverLocation", {
        lat: latitude,
        lng: longitude,
      });

      // also send to REST API as backup every time
      (async () => {
        try {
          await api.patch("/driver/location", { lng: longitude, lat: latitude });
        } catch (err) {
          // ignore
        }
      })();
    };

    const watchId = navigator.geolocation.watchPosition(geoSuccess, (err) => {
      console.warn("geo error", err);
    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Toggle online/offline
  const handleToggleOnline = async () => {
    try {
      const res = await api.patch("/driver/status");
      const data = res.data;
      setIsOnline(data.isOnline);
    } catch (err) { console.error(err); }
  };

  // Complete ride
  const handleCompleteRide = async () => {
    if (!currentRide) return;
    try {
      const res = await api.patch(`/driver/ride/${currentRide._id}/complete`);
      if (res.status === 200) {
        setHasActiveRide(false);
        setCurrentRide(null);
        fetchDashboard();
      }
    } catch (err) { console.error(err); }
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
              <h1 className="text-xl font-bold text-gradient">Driver Hub</h1>
              <p className="text-sm text-muted-foreground">Welcome back, Mike!</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${isOnline ? "text-success" : "text-muted-foreground"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch 
                checked={isOnline} 
                onCheckedChange={handleToggleOnline}
              />
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
                        <div className="font-medium">{currentRide.rider.name}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-500 mr-1" />
                          {currentRide.rider.rating || 5}
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
                      <span className="font-medium">{currentRide.pickup.address}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-medium">{currentRide.destination.address}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">{currentRide.distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ETA:</span>
                      <span className="font-medium">{currentRide.estimatedTimeMin} min</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium">Fare:</span>
                      <span className="text-2xl font-bold text-gradient">${currentRide.fare}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline">
                        <Navigation className="w-4 h-4 mr-2" />
                        Navigate
                      </Button>
                      <Button 
                        className="btn-gradient"
                        onClick={handleCompleteRide}
                      >
                        Complete Ride
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
                    <div 
                      className="bg-primary/20 rounded-lg mx-auto relative overflow-hidden"
                      style={{ height: '100px', width: '40px' }}
                    >
                      <div 
                        className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-1000"
                        style={{ 
                          height: `${(stat.earnings / 310) * 100}%`,
                          background: 'var(--gradient-primary)'
                        }}
                      ></div>
                    </div>
                    <div className="text-xs font-medium mt-2">${stat.earnings}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Total This Week</div>
                  <div className="text-2xl font-bold text-gradient">
                    ${weeklyStats.reduce((sum, day) => sum + day.earnings, 0)}
                  </div>
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

        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="map-container h-80 bg-gradient-to-br from-primary/20 via-primary-blue/20 to-primary-teal/20 flex items-center justify-center">
              <div className="text-center text-white">
                <MapPin className="w-16 h-16 mx-auto mb-4 animate-pulse-glow" />
                <p className="text-lg font-medium">Live Map View</p>
                <p className="text-sm opacity-80">Connect Mapbox to see nearby ride requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;
