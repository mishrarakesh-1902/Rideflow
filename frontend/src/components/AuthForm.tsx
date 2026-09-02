import { useState } from "react";
import { useNavigate } from "react-router-dom"; // for navigation
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Car,
  Shield
} from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: "driver" | "rider"; // only valid enum values
}

const AuthForm: React.FC = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<"rider" | "driver">("rider");
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ---------------- Login ----------------
  const handleLogin = async () => {
    try {
      // const response = await axios.post("http://localhost:5000/api/auth/login", {
      const response = await axios.post("https://rideflow1.onrender.com/api/auth/login", {
        email: formData.email,
        password: formData.password
      });

      const user: User = response.data.user;
      const token: string = response.data.token;

      // Save token and user info
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Role-based redirect
      if (user.role === "driver") {
        navigate("/driver");
      } else if (user.role === "rider") {
        navigate("/rider");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      console.error("Login error:", error.response?.data || error.message);
      alert(errMsg || "Login failed");
    }
  };

  // ---------------- Signup ----------------
  const handleRegister = async () => {
    try {
      if (!formData.name || !formData.email || !formData.password) {
        alert("Please fill all required fields");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      const response = await axios.post("https://rideflow1.onrender.com/api/auth/signup", {
      // const response = await axios.post("http://localhost:5000/api/auth/signup", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: userType
      });

      console.log("Signup successful:", response.data);
      alert("Signup successful! You can now login.");
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      console.error("Signup error:", error.response?.data || error.message);
      alert(errMsg || "Signup failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">RideFlow</p>
          <h1 className="text-4xl lg:text-5xl font-black">The kinetic pulse of modern logistics.</h1>
          <p className="text-lg text-muted-foreground max-w-lg">
            Join the elite network of riders and drivers moving the world forward with precision and speed. Optimize route flow, earn more, and ride safely.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Secure</p>
              <p className="font-semibold">Bank-grade encrypted auth</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Live</p>
              <p className="font-semibold">Real-time driver tracking</p>
            </div>
          </div>
        </section>

        <Card className="glass-card w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gradient mb-2">Get Started</CardTitle>
            <p className="text-muted-foreground">Choose your path in the ecosystem</p>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl overflow-hidden border border-border">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button className="w-full btn-gradient h-11" onClick={handleLogin}>
                  Sign In
                </Button>
              </div>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="space-y-4">
              <div className="space-y-3">
                <Label>I want to</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setUserType("rider")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userType === "rider"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Car className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-sm font-medium">Get Rides</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("driver")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userType === "driver"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Shield className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <div className="text-sm font-medium">Drive & Earn</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Enter your full name"
                      className="pl-10"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ✅ Confirm Password field */}
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    />
                  </div>
                </div>

                <Button className="w-full btn-gradient h-11" onClick={handleRegister}>
                  Create Account
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
  );
};

export default AuthForm;
