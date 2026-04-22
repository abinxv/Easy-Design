import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wand2, Clock, LogOut, User, FolderHeart, LayoutPanelTop, ListChecks, Image, ScanSearch, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth";
import { fetchDesignHistory, type SavedDesign } from "@/lib/designs";
import { fetchRoomUploads, type RoomUpload } from "@/lib/roomAnalysis";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const Dashboard = () => {
  const { user, token, logout, isLoading } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [uploads, setUploads] = useState<RoomUpload[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, navigate, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!token) {
        if (isMounted) {
          setHistoryLoading(false);
        }
        return;
      }

      try {
        const [designResponse, uploadResponse] = await Promise.all([
          fetchDesignHistory(token),
          fetchRoomUploads(token),
        ]);
        if (!isMounted) {
          return;
        }
        setDesigns(designResponse.designs);
        setUploads(uploadResponse.uploads);
        setHistoryError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setHistoryError(error instanceof Error ? error.message : "Unable to load your saved designs.");
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (isLoading || !user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  const uniqueRooms = new Set(designs.map((design) => design.room)).size;
  const uniqueItems = new Set([
    ...designs.flatMap((design) => design.selectedItems),
    ...uploads.flatMap((upload) => upload.detectedObjects.map((object) => object.label)),
  ]).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
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
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
            {[
              { label: "Saved Designs", value: String(designs.length), icon: FolderHeart, color: "text-primary" },
              { label: "Uploaded Rooms", value: String(uploads.length), icon: Image, color: "text-secondary" },
              { label: "Room Types Used", value: String(uniqueRooms), icon: LayoutPanelTop, color: "text-secondary" },
              { label: "Unique Items Found", value: String(uniqueItems), icon: ListChecks, color: "text-primary" },
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <Card
              className="shadow-card cursor-pointer hover:shadow-elevated transition-shadow group"
              onClick={() => navigate("/analyze")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-14 h-14 rounded-xl gradient-warm flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Wand2 className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Create a New Design Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Pick a room, select furniture, and save fresh Pinterest inspiration results.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Uploaded Room Photos</CardTitle>
                </div>
                <CardDescription>Your recent Room Shop uploads and detected objects</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading && <p className="text-muted-foreground">Loading your uploaded rooms...</p>}

                {!historyLoading && historyError && (
                  <p className="text-destructive">{historyError}</p>
                )}

                {!historyLoading && !historyError && uploads.length === 0 && (
                  <div className="rounded-xl bg-accent/30 p-5">
                    <p className="font-medium text-foreground mb-1">No room photos saved yet</p>
                    <p className="text-sm text-muted-foreground">
                      Upload and analyze a room photo while signed in, and it will appear here.
                    </p>
                  </div>
                )}

                {!historyLoading && !historyError && uploads.length > 0 && (
                  <div className="grid gap-5 md:grid-cols-2">
                    {uploads.slice(0, 6).map((upload) => (
                      <div key={upload.id} className="overflow-hidden rounded-2xl border border-border bg-accent/20">
                        <div className="aspect-[4/3] bg-muted/40">
                          {upload.sourceImageUrl ? (
                            <img
                              src={upload.sourceImageUrl}
                              alt={upload.fileName || "Uploaded room"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                              Image preview unavailable
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium text-foreground">
                                {upload.fileName || "Room photo"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {upload.detectedObjects.length} object{upload.detectedObjects.length === 1 ? "" : "s"} analyzed on {formatDate(upload.createdAt)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="w-fit">
                              Room Shop
                            </Badge>
                          </div>

                          {upload.detectedObjects.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {upload.detectedObjects.slice(0, 6).map((object) => (
                                <span
                                  key={`${upload.id}-${object.id}`}
                                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-foreground capitalize"
                                >
                                  {object.label}
                                </span>
                              ))}
                              {upload.detectedObjects.length > 6 && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-foreground">
                                  +{upload.detectedObjects.length - 6} more
                                </span>
                              )}
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button variant="outline" size="sm" onClick={() => navigate("/room-shop")}>
                              <ScanSearch className="w-4 h-4" />
                              Analyze More
                            </Button>
                            {upload.sourceImageUrl ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={upload.sourceImageUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4" />
                                  Open Image
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Saved Design History</CardTitle>
                </div>
                <CardDescription>Your recent room inspiration searches</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading && <p className="text-muted-foreground">Loading your saved designs...</p>}

                {!historyLoading && historyError && (
                  <p className="text-destructive">{historyError}</p>
                )}

                {!historyLoading && !historyError && designs.length === 0 && (
                  <div className="rounded-xl bg-accent/30 p-5">
                    <p className="font-medium text-foreground mb-1">No saved designs yet</p>
                    <p className="text-sm text-muted-foreground">
                      Your inspiration searches will appear here after you run them while logged in.
                    </p>
                  </div>
                )}

                {!historyLoading && !historyError && designs.length > 0 && (
                  <div className="space-y-4">
                    {designs.map((design) => (
                      <div
                        key={design.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{design.roomLabel}</p>
                            <p className="text-sm text-muted-foreground">
                              {design.inspirations.length} inspiration links saved on {formatDate(design.createdAt)}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {design.selectedItems.slice(0, 4).map((item) => (
                                <span
                                  key={item}
                                  className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-foreground"
                                >
                                  {item}
                                </span>
                              ))}
                              {design.selectedItems.length > 4 && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-background text-foreground">
                                  +{design.selectedItems.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => navigate("/analyze")}>
                          Explore Again
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
