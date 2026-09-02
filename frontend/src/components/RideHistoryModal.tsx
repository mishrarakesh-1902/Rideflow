import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Car,
  Clock,
  Navigation,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Banknote,
} from "lucide-react";
import api from "@/services/api";

interface RideHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: "rider" | "driver";
}

const RideHistoryModal: React.FC<RideHistoryModalProps> = ({
  open,
  onOpenChange,
  userRole,
}) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "completed" | "cancelled" | "active">("all");

  useEffect(() => {
    if (open) {
      fetchRideHistory();
    }
  }, [open, userRole]);

  const fetchRideHistory = async () => {
    try {
      setLoading(true);
      const endpoint = userRole === "driver" ? "/driver/rides" : "/rides/my";
      const res = await api.get(endpoint);
      const data = res.data.bookings || res.data || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch ride history", err);
      // Fallback for driver in case of alternative route mount
      if (userRole === "driver") {
        try {
          const fallbackRes = await api.get("/bookings/driver/rides");
          const fallbackData = fallbackRes.data.bookings || fallbackRes.data || [];
          setBookings(Array.isArray(fallbackData) ? fallbackData : []);
        } catch (innerErr) {
          console.error("Fallback driver history failed", innerErr);
          setBookings([]);
        }
      } else {
        setBookings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelled
          </Badge>
        );
      case "started":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 animate-pulse">
            <Navigation className="w-3 h-3" /> In Progress
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Driver Assigned
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Pending Payment
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-700 text-slate-300 border border-white/10">
            {status || "Requested"}
          </Badge>
        );
    }
  };

  const formatFare = (fare: any) => {
    if (typeof fare !== "number") return "0.00";
    // If fare is in paise (standard in backend >= 100), convert to rupees
    const amount = fare >= 100 ? fare / 100 : fare;
    return amount.toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter rides based on tab and search
  const filteredBookings = bookings.filter((b) => {
    // Tab filter
    if (activeTab === "completed" && b.status !== "completed") return false;
    if (activeTab === "cancelled" && b.status !== "cancelled") return false;
    if (activeTab === "active" && !["accepted", "started", "requested", "pending_payment"].includes(b.status)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pickup = (b.pickup?.address || "").toLowerCase();
      const dest = (b.destination?.address || "").toLowerCase();
      const personName = userRole === "rider" ? (b.driver?.name || "").toLowerCase() : (b.rider?.name || "").toLowerCase();
      return pickup.includes(q) || dest.includes(q) || personName.includes(q);
    }

    return true;
  });

  // Calculate totals
  const totalCompletedAmount = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (typeof b.fare === "number" ? (b.fare >= 100 ? b.fare / 100 : b.fare) : 0), 0);

  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const activeCount = bookings.filter((b) => ["accepted", "started", "requested", "pending_payment"].includes(b.status)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border border-white/10 max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="space-y-1 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <History className="w-4 h-4 text-teal-400" />
              </div>
              <DialogTitle className="text-xl font-bold">
                {userRole === "driver" ? "Trip & Earnings History" : "My Ride History"}
              </DialogTitle>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={fetchRideHistory}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {userRole === "driver"
              ? "Track all passenger pickups, completed journeys, and ride earnings."
              : "Review your past routes, driver details, and receipts."}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats Card */}
        <div className="grid grid-cols-3 gap-3 my-3 shrink-0">
          <div className="glass-card p-3 text-center bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Rides</p>
            <p className="text-lg font-bold text-slate-100">{bookings.length}</p>
          </div>
          <div className="glass-card p-3 text-center bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-lg font-bold text-emerald-400">{completedCount}</p>
          </div>
          <div className="glass-card p-3 text-center bg-slate-800/40 rounded-xl border border-white/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {userRole === "driver" ? "Total Earned" : "Total Spent"}
            </p>
            <p className="text-lg font-bold text-gradient">₹{totalCompletedAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="space-y-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by location or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-white/10 text-sm h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === "all" ? "bg-cyan-500/20 text-cyan-300 font-semibold shadow" : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === "completed" ? "bg-emerald-500/20 text-emerald-300 font-semibold shadow" : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === "active" ? "bg-blue-500/20 text-blue-300 font-semibold shadow" : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cancelled")}
              className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === "cancelled" ? "bg-rose-500/20 text-rose-300 font-semibold shadow" : "text-muted-foreground hover:text-slate-200"
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>

        {/* Scrollable Rides List */}
        <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
          {loading && bookings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Loading ride history...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground text-sm border border-dashed border-white/10 rounded-xl p-6">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-slate-300">No rides found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try refining your search terms" : "New trips will appear here once booked"}
              </p>
            </div>
          ) : (
            filteredBookings.map((ride) => {
              const otherParty = userRole === "rider" ? ride.driver : ride.rider;
              const dateDisplay = formatDate(ride.createdAt || ride.requestedAt);

              return (
                <div
                  key={ride._id}
                  className="p-4 rounded-xl bg-slate-800/60 border border-white/10 hover:border-cyan-500/40 transition-all space-y-3"
                >
                  {/* Card Header: Date, Status, Fare */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{dateDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ride.status)}
                      <span className="text-base font-bold text-gradient">₹{formatFare(ride.fare)}</span>
                    </div>
                  </div>

                  {/* Route Info */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground font-medium uppercase text-[10px]">Pickup</span>
                        <p className="text-slate-200 truncate">{ride.pickup?.address || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground font-medium uppercase text-[10px]">Destination</span>
                        <p className="text-slate-200 truncate">{ride.destination?.address || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Meta: Other party, Distance, Payment */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-slate-200 font-medium truncate max-w-[130px]">
                        {otherParty?.name || (userRole === "rider" ? "Driver Unassigned" : "Rider")}
                      </span>
                      {otherParty?.vehicle && (
                        <span className="text-slate-400 text-[11px] truncate max-w-[120px] hidden sm:inline">
                          • {otherParty.vehicle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {ride.distanceKm ? (
                        <span className="text-slate-300">{ride.distanceKm} km</span>
                      ) : null}
                      <span className="flex items-center gap-1 capitalize text-slate-300">
                        {ride.paymentMethod === "cash" ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Cash
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-cyan-400" /> Online
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Cancellation Reason if any */}
                  {ride.status === "cancelled" && ride.cancellationReason && (
                    <div className="text-[11px] text-rose-400/90 bg-rose-500/10 px-2.5 py-1 rounded-md">
                      Reason: {ride.cancellationReason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RideHistoryModal;
