import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Car, Shield,
  ArrowLeft, ArrowRight, CheckCircle2, Check
} from "lucide-react";

interface FormData {
  name: string; email: string; phone: string;
  password: string; confirmPassword: string;
}

const AuthForm: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register" | "role">(() => {
    if (typeof window !== "undefined" && window.location.search.includes("role")) {
      return "role";
    }
    return "login";
  });
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [userType, setUserType] = useState<"rider" | "driver">("rider");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "", email: "", phone: "", password: "", confirmPassword: ""
  });
  const set = (field: keyof FormData, val: string) =>
    setFormData(p => ({ ...p, [field]: val }));

  const handleLogin = async () => {
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email: formData.email, password: formData.password });
      const { user, token } = r.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      navigate(user.role === "driver" ? "/driver" : "/rider");
    } catch (e: any) {
      alert(e.response?.data?.message || e.response?.data?.error || e.message || "Login failed");
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) { alert("Fill all required fields"); return; }
    if (formData.password !== formData.confirmPassword) { alert("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/signup", {
        name: formData.name, email: formData.email, phone: formData.phone,
        password: formData.password, role: userType,
      });
      alert("Account created! You can now sign in.");
      setTab("login");
    } catch (e: any) {
      alert(e.response?.data?.message || e.response?.data?.error || e.message || "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0B1426 0%, #0D1B3E 40%, #0B1A35 70%, #091428 100%)" }}>

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #304BFF, transparent)", transform: "translate(-40%, -40%)" }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6B7FFF, transparent)", transform: "translate(40%, 40%)" }} />
      </div>

      {/* Back to home */}
      <button onClick={() => navigate("/")}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-white/60 hover:text-white transition text-sm font-medium z-10">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {/* ══════════════════════════════════════════════════════
          SCREEN 4: ROLE SELECTION MODAL ("Choose Your Role")
      ══════════════════════════════════════════════════════ */}
      {tab === "role" ? (
        <div className="relative w-full max-w-[620px] bg-white rounded-3xl shadow-2xl p-8 z-10 space-y-6">
          <div className="flex items-center justify-between border-b border-[#E4EAF6] pb-4">
            <button
              onClick={() => setTab("login")}
              className="text-[#536184] hover:text-[#11152F] flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#304BFF] flex items-center justify-center text-white font-black text-xs">
                R
              </div>
              <span className="font-black text-[#11152F] text-base">RideFlow</span>
            </div>
            <div className="w-12" />
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-[#11152F]">Choose Your Role</h1>
            <p className="text-xs text-[#536184]">Start your journey with us</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Rider */}
            <div className="p-6 rounded-3xl border-2 border-[#E4EAF6] hover:border-[#304BFF] bg-[#F5F8FF] hover:bg-[#EAEFFF]/50 transition-all space-y-4 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#E4EAF6] flex items-center justify-center text-3xl shadow-sm mx-auto group-hover:scale-105 transition">
                  🎒
                </div>
                <div className="text-center">
                  <h3 className="font-black text-lg text-[#11152F]">Rider</h3>
                  <p className="text-[11px] text-[#536184] mt-0.5">Need a fast, comfortable ride?</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E4EAF6]">
                  {[
                    "Book rides seamlessly",
                    "Track driver in real-time",
                    "Multiple payment options",
                  ].map((perk) => (
                    <div key={perk} className="flex items-center gap-2 text-xs text-[#11152F]">
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setUserType("rider");
                  setTab("register");
                }}
                className="w-full py-3 bg-[#304BFF] hover:bg-[#2538e0] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                Continue as Rider <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Card 2: Driver */}
            <div className="p-6 rounded-3xl border-2 border-[#E4EAF6] hover:border-[#304BFF] bg-[#F5F8FF] hover:bg-[#EAEFFF]/50 transition-all space-y-4 flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white border border-[#E4EAF6] flex items-center justify-center text-3xl shadow-sm mx-auto group-hover:scale-105 transition">
                  🚗
                </div>
                <div className="text-center">
                  <h3 className="font-black text-lg text-[#11152F]">Driver</h3>
                  <p className="text-[11px] text-[#536184] mt-0.5">Drive and earn on your schedule</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E4EAF6]">
                  {[
                    "Earn on your own time",
                    "Flexible working schedule",
                    "Be your own boss with instant payouts",
                  ].map((perk) => (
                    <div key={perk} className="flex items-center gap-2 text-xs text-[#11152F]">
                      <Check className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setUserType("driver");
                  setTab("register");
                }}
                className="w-full py-3 bg-white hover:bg-[#EAEFFF] border-2 border-[#304BFF] text-[#304BFF] font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
              >
                Continue as Driver <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════
            SCREENS 2 & 3: AUTH CARD (LOGIN & REGISTER)
        ══════════════════════════════════════════════════════ */
        <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl p-8 z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-2"
              style={{ background: "linear-gradient(135deg, #304BFF, #6B7FFF)" }}>
              R
            </div>
            <span className="text-lg font-black text-[#11152F]">RideFlow</span>
          </div>

          {/* Tab switcher: Sign In | Create Account | Choose Role */}
          <div className="flex p-1 bg-[#F5F8FF] border border-[#E4EAF6] rounded-2xl gap-1 mb-6">
            <button
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${tab === "login" ? "bg-[#304BFF] text-white shadow-sm" : "text-[#536184] hover:text-[#304BFF]"}`}
              onClick={() => setTab("login")}>
              Sign In
            </button>
            <button
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${tab === "register" ? "bg-[#304BFF] text-white shadow-sm" : "text-[#536184] hover:text-[#304BFF]"}`}
              onClick={() => setTab("register")}>
              Sign Up
            </button>
            <button
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-[#536184] hover:text-[#304BFF] transition-all"
              onClick={() => setTab("role")}>
              Roles
            </button>
          </div>

          {/* ── SCREEN 2: LOGIN FORM ── */}
          {tab === "login" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-black text-[#11152F]">Welcome Back</h1>
                <p className="text-xs text-[#536184] mt-1">Sign in to continue your journey</p>
              </div>

              {/* Social buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => alert("Social sign-in: Please enter your email and password below")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-[#E4EAF6] rounded-xl bg-white hover:bg-[#F5F8FF] transition text-xs font-bold text-[#11152F]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => alert("Social sign-in: Please enter your email and password below")}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-[#E4EAF6] rounded-xl bg-white hover:bg-[#F5F8FF] transition text-xs font-bold text-[#11152F]"
                >
                  <svg className="w-4 h-4 text-[#11152F]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* OR divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-[#E4EAF6]" />
                <span className="text-[10px] text-[#A0AABF] font-bold uppercase">OR</span>
                <div className="flex-1 border-t border-[#E4EAF6]" />
              </div>

              {/* Fields */}
              <AuthField icon={<Mail className="w-4 h-4"/>} label="Email Address" type="email"
                value={formData.email} onChange={v => set("email", v)} placeholder="Enter your email" />
              <AuthPasswordField label="Password" show={showPw} toggle={() => setShowPw(v => !v)}
                value={formData.password} onChange={v => set("password", v)} />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => alert("Password reset instructions sent to your email.")}
                  className="text-xs text-[#304BFF] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #304BFF, #5B7FFF)" }}
              >
                {loading ? <Spinner /> : <>Sign In <ArrowRight className="w-4 h-4"/></>}
              </button>

              <p className="text-center text-xs text-[#536184]">
                Don't have an account?{" "}
                <button className="text-[#304BFF] font-semibold hover:underline" onClick={() => setTab("register")}>Sign up</button>
              </p>
            </div>
          )}

          {/* ── SCREEN 3: REGISTER FORM ── */}
          {tab === "register" && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h1 className="text-2xl font-black text-[#11152F]">Create Your Account</h1>
                <p className="text-xs text-[#536184] mt-1">Join thousands of riders and drivers</p>
              </div>

              {/* Rider / Driver toggle */}
              <div className="flex p-1 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl gap-1">
                {(["rider", "driver"] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserType(role)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      userType === role ? "bg-[#304BFF] text-white shadow-sm" : "text-[#536184] hover:text-[#304BFF]"
                    }`}
                  >
                    {role === "rider" ? <Car className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    {role === "rider" ? "Rider" : "Driver"}
                  </button>
                ))}
              </div>

              <AuthField icon={<User className="w-4 h-4"/>} label="Full Name" type="text"
                value={formData.name} onChange={v => set("name", v)} placeholder="Enter your full name" />
              <AuthField icon={<Mail className="w-4 h-4"/>} label="Email Address" type="email"
                value={formData.email} onChange={v => set("email", v)} placeholder="Enter your email" />
              <AuthField icon={<Phone className="w-4 h-4"/>} label="Phone Number" type="tel"
                value={formData.phone} onChange={v => set("phone", v)} placeholder="Enter phone number" />
              <AuthPasswordField label="Password" show={showPw} toggle={() => setShowPw(v => !v)}
                value={formData.password} onChange={v => set("password", v)} />
              <AuthPasswordField label="Confirm Password" show={showCPw} toggle={() => setShowCPw(v => !v)}
                value={formData.confirmPassword} onChange={v => set("confirmPassword", v)} />

              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #304BFF, #5B7FFF)" }}
              >
                {loading ? <Spinner /> : <>Create Account <ArrowRight className="w-4 h-4"/></>}
              </button>

              <p className="text-center text-xs text-[#536184]">
                Already have an account?{" "}
                <button className="text-[#304BFF] font-semibold hover:underline" onClick={() => setTab("login")}>Sign In</button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Helper components ── */
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
);

interface FieldProps {
  icon: React.ReactNode; label: string; type: string;
  value: string; onChange: (v: string) => void; placeholder: string;
}
const AuthField: React.FC<FieldProps> = ({ icon, label, type, value, onChange, placeholder }) => (
  <div>
    <label className="text-[11px] font-bold text-[#536184] mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2.5 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
      <span className="text-[#A0AABF] shrink-0">{icon}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
      />
    </div>
  </div>
);

interface PwFieldProps { label: string; show: boolean; toggle: () => void; value: string; onChange: (v: string) => void; }
const AuthPasswordField: React.FC<PwFieldProps> = ({ label, show, toggle, value, onChange }) => (
  <div>
    <label className="text-[11px] font-bold text-[#536184] mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2.5 bg-[#F5F8FF] border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
      <Lock className="w-4 h-4 text-[#A0AABF] shrink-0" />
      <input
        type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder="Enter password"
        className="flex-1 bg-transparent text-xs text-[#11152F] placeholder:text-[#A0AABF] outline-none"
      />
      <button type="button" onClick={toggle} className="text-[#A0AABF] hover:text-[#536184] transition">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

export default AuthForm;
