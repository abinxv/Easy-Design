import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Palette, Clock, LogOut, User, Sparkles, TrendingUp, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth";

const mockHistory = [
  { id: "1", room: "Living Room", style: "Modern Minimalist", date: "2026-03-04", colors: ["#C4A77D", "#2D5F2D", "#F5F0E8"] },
  { id: "2", room: "Bedroom", style: "Scandinavian", date: "2026-03-02", colors: ["#E8DED0", "#7A8B6E", "#FFFFFF"] },
  { id: "3", room: "Kitchen", style: "Industrial", date: "2026-02-28", colors: ["#4A4A4A", "#C4A77D", "#8B4513"] },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
          >
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarFallback className="gradient-warm text-primary-foreground text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Welcome, {user.name.split(" ")[0]}</h1>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { logout(); navigate("/"); }} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
          >
            {[
              { label: "Rooms Analyzed", value: "3", icon: Image, color: "text-primary" },
              { label: "Styles Explored", value: "6", icon: Sparkles, color: "text-secondary" },
              { label: "Design Score", value: "87", icon: TrendingUp, color: "text-primary" },
            ].map((stat) => (
              <Card key={stat.label} className="shadow-card">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10"
          >
            <Card
              className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow group"
              onClick={() => navigate("/analyze")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Analyze a Room</h3>
                  <p className="text-sm text-muted-foreground">Upload a photo and get AI design suggestions</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow group"
              onClick={() => navigate("/styles")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-14 h-14 rounded-xl gradient-sage flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Palette className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Browse Styles</h3>
                  <p className="text-sm text-muted-foreground">Explore curated interior design aesthetics</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Design History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Design History</CardTitle>
                </div>
                <CardDescription>Your recent room analyses and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.room}</p>
                          <p className="text-sm text-muted-foreground">{item.style} • {item.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.colors.map((color) => (
                          <div
                            key={color}
                            className="w-6 h-6 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
