import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Car,
  Star,
  Shield,
  Edit2,
  Check,
  X,
  LogOut,
  Calendar,
  Sparkles,
} from "lucide-react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUser?: any;
  onProfileUpdated?: (updatedUser: any) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onOpenChange,
  initialUser,
  onProfileUpdated,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState<any>(initialUser || null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  useEffect(() => {
    if (open) {
      fetchFreshProfile();
    } else {
      setIsEditing(false);
    }
  }, [open]);

  const fetchFreshProfile = async () => {
    try {
      setLoading(true);
      let res;
      try {
        res = await api.get("/users/me");
      } catch {
        res = await api.get("/auth/me");
      }
      const fetchedUser = res?.data?.user || res?.data;
      if (fetchedUser) {
        setUser(fetchedUser);
        setName(fetchedUser.name || "");
        setPhone(fetchedUser.phone || "");
        setVehicle(fetchedUser.vehicle || "");
        localStorage.setItem("user", JSON.stringify(fetchedUser));
      }
    } catch (err) {
      console.warn("Could not fetch latest profile from server, using local data", err);
      const local = JSON.parse(localStorage.getItem("user") || "null");
      if (local) {
        setUser(local);
        setName(local.name || "");
        setPhone(local.phone || "");
        setVehicle(local.vehicle || "");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setVehicle(user?.vehicle || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setVehicle(user?.vehicle || "");
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const payload: any = { name: name.trim(), phone: phone.trim() };
      if (user?.role === "driver") {
        payload.vehicle = vehicle.trim();
      }

      let res;
      try {
        res = await api.patch("/users/me", payload);
      } catch (err: any) {
        // Fallback to /auth/me or /auth/profile if /users/me returned 404
        if (err?.response?.status === 404) {
          try {
            res = await api.patch("/auth/me", payload);
          } catch {
            res = await api.patch("/auth/profile", payload);
          }
        } else {
          throw err;
        }
      }

      const updatedUser = res?.data?.user || { ...user, ...payload };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditing(false);

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      toast({
        title: "Profile Updated",
        description: "Your details have been saved successfully.",
      });
    } catch (err: any) {
      console.error("Profile update failed", err);
      toast({
        title: "Update Failed",
        description: err?.response?.data?.message || err?.message || "Unable to save profile changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onOpenChange(false);
    toast({
      title: "Logged Out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Recent";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-[#11152F] border border-[#E4EAF6] max-w-md p-6 rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAEFFF] border border-[#304BFF]/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#304BFF]" />
              </div>
              <DialogTitle className="text-xl font-bold text-[#11152F]">Account Profile</DialogTitle>
            </div>
            {user?.role && (
              <Badge
                variant="outline"
                className={`uppercase tracking-wider text-xs font-semibold px-2.5 py-0.5 ${
                  user.role === "driver"
                    ? "border-purple-500/50 text-purple-300 bg-purple-500/10"
                    : "border-cyan-500/50 text-cyan-300 bg-cyan-500/10"
                }`}
              >
                {user.role}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-[#536184]">
            Manage your personal credentials and platform details.
          </DialogDescription>
        </DialogHeader>

        {loading && !user ? (
          <div className="py-12 text-center text-[#536184] text-sm animate-pulse">
            Loading profile...
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* User Header Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6]">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#304BFF] to-[#6B7FFF] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#304BFF]/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold truncate text-[#11152F]">{user?.name || "User"}</h3>
                <p className="text-xs text-[#536184] truncate">{user?.email || "—"}</p>
                {user?.role === "driver" && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      {user?.rating ? user.rating.toFixed(1) : "5.0"}
                    </span>
                    <span className="text-[#E4EAF6]">•</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {user?.isOnline ? "Online" : "Ready"}
                    </span>
                  </div>
                )}
              </div>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-lg hover:bg-[#EAEFFF] text-[#304BFF]"
                  onClick={handleStartEdit}
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Form Fields */}
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-xs uppercase tracking-wider text-[#536184]">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-[#536184]" />
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="pl-9 bg-[#F5F8FF] border-[#E4EAF6] text-sm h-10 text-[#11152F]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-xs uppercase tracking-wider text-[#536184]">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-[#536184]" />
                    <Input
                      id="edit-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="pl-9 bg-[#F5F8FF] border-[#E4EAF6] text-sm h-10 text-[#11152F]"
                    />
                  </div>
                </div>

                {user?.role === "driver" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-vehicle" className="text-xs uppercase tracking-wider text-[#536184]">
                      Vehicle Information
                    </Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-2.5 w-4 h-4 text-[#536184]" />
                      <Input
                        id="edit-vehicle"
                        value={vehicle}
                        onChange={(e) => setVehicle(e.target.value)}
                        placeholder="e.g. Tesla Model 3 • KA-01-AB-1234"
                        className="pl-9 bg-[#F5F8FF] border-[#E4EAF6] text-sm h-10 text-[#11152F]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-[#E4EAF6] text-[#536184] hover:bg-[#F5F8FF]"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-1.5" /> Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-[#304BFF] to-[#6B7FFF] text-white hover:opacity-90"
                    disabled={saving}
                  >
                    {saving ? (
                      "Saving..."
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1.5" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] text-sm">
                    <div className="flex items-center gap-2.5 text-[#536184]">
                      <Mail className="w-4 h-4 text-[#304BFF]" />
                      <span>Email</span>
                    </div>
                    <span className="font-medium text-[#11152F]">{user?.email || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] text-sm">
                    <div className="flex items-center gap-2.5 text-[#536184]">
                      <Phone className="w-4 h-4 text-[#304BFF]" />
                      <span>Phone</span>
                    </div>
                    <span className="font-medium text-[#11152F]">{user?.phone || "Not set"}</span>
                  </div>

                  {user?.role === "driver" && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] text-sm">
                      <div className="flex items-center gap-2.5 text-[#536184]">
                        <Car className="w-4 h-4 text-purple-500" />
                        <span>Vehicle</span>
                      </div>
                      <span className="font-medium text-[#11152F]">{user?.vehicle || "Not registered"}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8FF] border border-[#E4EAF6] text-sm">
                    <div className="flex items-center gap-2.5 text-[#536184]">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Member Since</span>
                    </div>
                    <span className="font-medium text-[#11152F]">{formattedDate}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-[#E4EAF6] flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#E4EAF6] text-[#536184] text-xs h-9 hover:bg-[#F5F8FF]"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-9"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" /> Log Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
