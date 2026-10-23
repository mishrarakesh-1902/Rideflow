import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import {
  Mail, Lock, User, Phone, Eye, EyeOff, Car, Shield,
  ArrowLeft, ArrowRight, CheckCircle2, Star, Navigation2
} from "lucide-react";

interface FormData {
  name: string; email: string; phone: string;
  password: string; confirmPassword: string;
}

const AuthForm: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login"|"register">("login");
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [userType, setUserType] = useState<"rider"|"driver">("rider");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name:"", email:"", phone:"", password:"", confirmPassword:""
  });
  const set = (field: keyof FormData, val: string) =>
    setFormData(p => ({...p, [field]: val}));

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

  const riderPerks = ["Book rides in real-time","Live driver tracking","Multiple payment options","Safe, verified drivers"];
  const driverPerks = ["Earn on your schedule","Flexible working hours","Weekly instant payouts","Performance bonuses"];

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex">
      {/* ── Left panel (decorative) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-10"
        style={{ background: "linear-gradient(160deg, #304BFF 0%, #1A2BA8 60%, #0D1660 100%)" }}>
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(-40%,-40%)" }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(40%,40%)" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-lg">R</div>
          <span className="text-xl font-black text-white">RideFlow</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <h2 className="text-4xl font-black text-white leading-tight">
            Ride Smarter<br/>Every Day
          </h2>
          <div className="space-y-3">
            {[
              { icon: Navigation2, text: "Real-time tracking" },
              { icon: CreditCard_, text: "Multiple payment options" },
              { icon: Shield,  text: "Safe and verified drivers" },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="relative">
          <p className="text-white/50 text-xs">Trusted by 2M+ riders</p>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex flex-col">
        {/* Top nav */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[#E4EAF6] bg-white">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-semibold text-[#536184] hover:text-[#304BFF] transition">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: "var(--gradient-primary)" }}>R</div>
            <span className="font-black text-[#11152F]">RideFlow</span>
          </div>
        </header>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 overflow-y-auto">
          <div className="w-full max-w-[400px] space-y-6">

            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#11152F]">
                {tab === "login" ? "Welcome Back" : "Create Your Account"}
              </h1>
              <p className="text-sm text-[#536184] mt-1">
                {tab === "login" ? "Sign in to continue your journey" : "Join the network of riders and drivers"}
              </p>
            </div>

            {/* Tab switch */}
            <div className="pill-nav">
              <button className={`pill-nav-item flex-1 text-center ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>Sign In</button>
              <button className={`pill-nav-item flex-1 text-center ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>Create Account</button>
            </div>

            {/* ── LOGIN FORM ── */}
            {tab === "login" && (
              <div className="space-y-4">
                <Field icon={<Mail className="w-4 h-4"/>} label="Email Address" type="email"
                  value={formData.email} onChange={v => set("email",v)} placeholder="Enter your email" />
                <PasswordField label="Password" show={showPw} toggle={() => setShowPw(v=>!v)}
                  value={formData.password} onChange={v => set("password",v)} />

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="btn-primary w-full py-3 text-sm"
                >
                  {loading ? <Spinner /> : <>Sign In <ArrowRight className="w-4 h-4"/></>}
                </button>

                <p className="text-center text-xs text-[#536184]">
                  Don't have an account?{" "}
                  <button className="text-[#304BFF] font-semibold hover:underline" onClick={() => setTab("register")}>Sign up</button>
                </p>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {tab === "register" && (
              <div className="space-y-4">
                {/* Role selector */}
                <div>
                  <label className="text-xs font-semibold text-[#536184] uppercase tracking-wider mb-2 block">I want to</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(["rider","driver"] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => setUserType(role)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                          userType === role
                            ? "border-[#304BFF] bg-[#EAEFFF]"
                            : "border-[#E4EAF6] bg-white hover:border-[#304BFF]/40"
                        }`}
                      >
                        {userType === role && (
                          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-[#304BFF]" />
                        )}
                        <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${userType === role ? "bg-[#304BFF]" : "bg-[#F5F8FF]"}`}>
                          {role === "rider"
                            ? <Car className={`w-4 h-4 ${userType === role ? "text-white" : "text-[#536184]"}`} />
                            : <Shield className={`w-4 h-4 ${userType === role ? "text-white" : "text-[#536184]"}`} />
                          }
                        </div>
                        <div className={`text-sm font-bold ${userType === role ? "text-[#304BFF]" : "text-[#11152F]"}`}>
                          {role === "rider" ? "Get Rides" : "Drive & Earn"}
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {(role === "rider" ? riderPerks : driverPerks).slice(0,2).map(p => (
                            <li key={p} className="flex items-center gap-1 text-[10px] text-[#536184]">
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#16B86A] shrink-0" /> {p}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                </div>

                <Field icon={<User className="w-4 h-4"/>} label="Full Name" type="text"
                  value={formData.name} onChange={v => set("name",v)} placeholder="Enter your full name" />
                <Field icon={<Mail className="w-4 h-4"/>} label="Email Address" type="email"
                  value={formData.email} onChange={v => set("email",v)} placeholder="Enter your email" />
                <Field icon={<Phone className="w-4 h-4"/>} label="Phone Number" type="tel"
                  value={formData.phone} onChange={v => set("phone",v)} placeholder="Enter phone number" />
                <PasswordField label="Password" show={showPw} toggle={() => setShowPw(v=>!v)}
                  value={formData.password} onChange={v => set("password",v)} />
                <PasswordField label="Confirm Password" show={showCPw} toggle={() => setShowCPw(v=>!v)}
                  value={formData.confirmPassword} onChange={v => set("confirmPassword",v)} />

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="btn-primary w-full py-3 text-sm"
                >
                  {loading ? <Spinner /> : <>Create Account <ArrowRight className="w-4 h-4"/></>}
                </button>

                <p className="text-center text-xs text-[#536184]">
                  Already have an account?{" "}
                  <button className="text-[#304BFF] font-semibold hover:underline" onClick={() => setTab("login")}>Sign in</button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Tiny helper components ── */
const CreditCard_ = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
);

interface FieldProps {
  icon: React.ReactNode; label: string; type: string;
  value: string; onChange: (v:string)=>void; placeholder: string;
}
const Field: React.FC<FieldProps> = ({ icon, label, type, value, onChange, placeholder }) => (
  <div>
    <label className="text-xs font-semibold text-[#536184] uppercase tracking-wider mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2.5 bg-white border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
      <span className="text-[#A0AABF] shrink-0">{icon}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-[#11152F] placeholder:text-[#A0AABF] outline-none"
      />
    </div>
  </div>
);

interface PwFieldProps { label: string; show: boolean; toggle: ()=>void; value: string; onChange: (v:string)=>void; }
const PasswordField: React.FC<PwFieldProps> = ({ label, show, toggle, value, onChange }) => (
  <div>
    <label className="text-xs font-semibold text-[#536184] uppercase tracking-wider mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2.5 bg-white border border-[#E4EAF6] rounded-xl px-3 py-2.5 focus-within:border-[#304BFF] focus-within:ring-2 focus-within:ring-[#304BFF]/15 transition-all">
      <Lock className="w-4 h-4 text-[#A0AABF] shrink-0" />
      <input
        type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder="Enter password"
        className="flex-1 bg-transparent text-sm text-[#11152F] placeholder:text-[#A0AABF] outline-none"
      />
      <button type="button" onClick={toggle} className="text-[#A0AABF] hover:text-[#536184] transition">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

export default AuthForm;
