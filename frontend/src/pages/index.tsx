import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MapPin, 
  Car, 
  Shield, 
  Clock, 
  Star, 
  Smartphone,
  ChevronRight,
  Play
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState("rider");

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Smart Location",
      description: "AI-powered pickup and drop-off with precise location tracking"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Safe & Secure", 
      description: "Advanced safety features and verified driver profiles"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Fast Matching",
      description: "Get matched with nearby drivers in under 30 seconds"
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "Premium Experience",
      description: "5-star rated service with luxury vehicle options"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center animated-bg">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Modern ride-hailing experience"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <div className="animate-float">
            <h1 className="text-6xl md:text-8xl font-bold mb-6">
              <span className="text-gradient">RideFlow</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white max-w-3xl mx-auto">
              Experience the future of ride-hailing with our revolutionary platform. 
              Seamless, safe, and smarter transportation for everyone.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              <Smartphone className="mr-2" />
              Get Started Now
            </Button>
            <Button variant="outline" className="h-14 px-8 glass-card border-white/20 text-white hover:bg-white/20">
              <Play className="mr-2" />
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { number: "1M+", label: "Happy Riders" },
              { number: "50K+", label: "Active Drivers" },
              { number: "4.9", label: "Average Rating" },
              { number: "24/7", label: "Support" }
            ].map((stat, index) => (
              <div key={index} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-2">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="text-gradient">RideFlow?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced technology meets exceptional service to deliver the ultimate transportation experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="glass-card p-8 text-center hover:scale-105 transition-transform duration-300">
                <CardContent className="p-0">
                  <div className="text-primary mb-4 flex justify-center">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-24 animated-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Choose Your Experience
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto">
              Whether you're riding or driving, RideFlow has the perfect interface for you
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex justify-center mb-12">
            <div className="glass-card p-2 inline-flex rounded-full">
              <Button
                variant={activeTab === "rider" ? "default" : "ghost"}
                className={`rounded-full px-8 py-3 ${activeTab === "rider" ? "btn-gradient" : "text-white hover:bg-white/10"}`}
                onClick={() => setActiveTab("rider")}
              >
                For Riders
              </Button>
              <Button
                variant={activeTab === "driver" ? "default" : "ghost"}  
                className={`rounded-full px-8 py-3 ${activeTab === "driver" ? "btn-gradient" : "text-white hover:bg-white/10"}`}
                onClick={() => setActiveTab("driver")}
              >
                For Drivers
              </Button>
            </div>
          </div>
          
          {/* Preview Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="glass-card p-8">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-4 text-white">
                  {activeTab === "rider" ? "Rider Dashboard" : "Driver Dashboard"}
                </h3>
                <div className="bg-white/5 rounded-2xl p-6 mb-6">
                  {activeTab === "rider" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Where to?</span>
                        <MapPin className="text-primary" />
                      </div>
                      <div className="h-32 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Car className="text-primary text-4xl" />
                      </div>
                      <div className="flex justify-between text-white/70">
                        <span>Estimated: $12.50</span>
                        <span>ETA: 5 min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Online Status</span>
                        <div className="w-3 h-3 bg-success rounded-full"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gradient">$248</div>
                          <div className="text-white/70 text-sm">Today's Earnings</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gradient">4.9</div>
                          <div className="text-white/70 text-sm">Rating</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Button className="w-full btn-gradient">
                  {activeTab === "rider" ? "Request Ride" : "Go Online"} 
                  <ChevronRight className="ml-2" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="glass-card p-8">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-4 text-white">Key Features</h3>
                <div className="space-y-4">
                  {activeTab === "rider" ? (
                    <>
                      <div className="flex items-center text-white/80">
                        <MapPin className="mr-3 text-primary" />
                        Real-time GPS tracking
                      </div>
                      <div className="flex items-center text-white/80">
                        <Shield className="mr-3 text-primary" />
                        Safety & security features
                      </div>
                      <div className="flex items-center text-white/80">
                        <Star className="mr-3 text-primary" />
                        Rate your experience
                      </div>
                      <div className="flex items-center text-white/80">
                        <Clock className="mr-3 text-primary" />
                        Schedule rides in advance
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-white/80">
                        <Car className="mr-3 text-primary" />
                        Smart ride matching
                      </div>
                      <div className="flex items-center text-white/80">
                        <MapPin className="mr-3 text-primary" />
                        Optimized routes
                      </div>
                      <div className="flex items-center text-white/80">
                        <Star className="mr-3 text-primary" />
                        Earnings analytics
                      </div>
                      <div className="flex items-center text-white/80">
                        <Shield className="mr-3 text-primary" />
                        Insurance coverage
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">Transform</span> Your Journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Join millions of users who have already made the switch to smarter transportation
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              Start Riding Today
            </Button>
            <Button 
              className="btn-gradient text-lg h-14 px-10"
              onClick={() => window.location.href = '/auth'}
            >
              Become a Driver
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <button 
        className="fab animate-pulse-glow"
        onClick={() => window.location.href = '/auth'}
      >
        <Car className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Index;