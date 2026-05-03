import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ImageUp,
  LoaderCircle,
  PackageSearch,
  ScanSearch,
  Search,
  ShoppingCart,
  ShoppingBag,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useRoomShopCart } from "@/hooks/useRoomShopCart";
import {
  analyzeRoomPhoto,
  fetchRoomAnalysisStatus,
  type MatchedRoomObject,
  type RoomAnalysisResponse,
  type RoomAnalysisStatus,
  type RoomMatch,
  type RoomShopCartItem,
} from "@/lib/roomAnalysis";

const MAX_IMAGE_DIMENSION = 1440;
const OUTPUT_IMAGE_QUALITY = 0.82;

function getServiceBadgeVariant(enabled: boolean) {
  return enabled ? "secondary" : "destructive";
}

function formatMatchPrice(match: RoomMatch) {
  return match.price?.value ? match.price.value.replace(/\*+$/, "") : null;
}

function getMatchModeLabel(mode: string) {
  if (mode === "lens_products") return "Google Lens products";
  if (mode === "lens_visual_matches") return "Google Lens visual matches";
  if (mode === "google_vision_fallback") return "Fallback web matches";
  return "No strong matches";
}

function createCartItemId(objectId: string) {
  return `${objectId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createCartItem(object: MatchedRoomObject, match: RoomMatch): RoomShopCartItem {
  return {
    id: createCartItemId(object.id),
    objectId: object.id,
    label: object.label,
    title: match.title,
    source: match.source,
    url: match.url,
    thumbnailUrl: match.thumbnailUrl || object.cropImageUrl || null,
    provider: match.provider,
    price: match.price,
    addedAt: new Date().toISOString(),
  };
}

async function resizeImageForUpload(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Unable to read the selected image."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare the image for upload.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", OUTPUT_IMAGE_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function cropImagePreview(
  imageUrl: string,
  box: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Unable to crop the analyzed room image."));
    element.src = imageUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width));
  canvas.height = Math.max(1, Math.round(box.height));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Your browser could not generate the object preview.");
  }

  context.drawImage(image, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const RoomShop = () => {
  const [status, setStatus] = useState<RoomAnalysisStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisImageUrl, setAnalysisImageUrl] = useState<string | null>(null);
  const [localCropUrls, setLocalCropUrls] = useState<Record<string, string>>({});
  const [matchResult, setMatchResult] = useState<RoomAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { token } = useAuth();
  const { cartUrls, isSignedIn, items: cartItems, saveItems, saving: cartSaving } = useRoomShopCart();
  const { toast } = useToast();

  const displayObjects = useMemo(() => matchResult?.detectedObjects ?? [], [matchResult]);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetchRoomAnalysisStatus();
        if (isMounted) setStatus(response);
      } catch (error) {
        if (isMounted) {
          toast({
            title: "Feature status unavailable",
            description: error instanceof Error ? error.message : "Unable to check the room shopping feature right now.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) setStatusLoading(false);
      }
    }

    loadStatus();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    let isMounted = true;

    async function buildLocalCrops() {
      if (!analysisImageUrl || displayObjects.length === 0) {
        if (isMounted) setLocalCropUrls({});
        return;
      }

      if (!displayObjects.some((object) => !object.cropImageUrl)) {
        if (isMounted) setLocalCropUrls({});
        return;
      }

      try {
        const entries = await Promise.all(
          displayObjects.map(async (object) => [
            object.id,
            object.cropImageUrl || (await cropImagePreview(analysisImageUrl, object.boundingBox)),
          ] as const)
        );
        if (isMounted) setLocalCropUrls(Object.fromEntries(entries));
      } catch {
        if (isMounted) setLocalCropUrls({});
      }
    }

    void buildLocalCrops();
    return () => {
      isMounted = false;
    };
  }, [analysisImageUrl, displayObjects]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setAnalysisImageUrl(null);
    setLocalCropUrls({});
    setMatchResult(null);
  };

  const reset = () => {
    setSelectedFile(null);
    setAnalysisImageUrl(null);
    setLocalCropUrls({});
    setMatchResult(null);
    setFileInputKey((value) => value + 1);
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedFile) {
      toast({
        title: "Upload a room photo first",
        description: "Choose a room image before running the analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageDataUrl = await resizeImageForUpload(selectedFile);
      const response = await analyzeRoomPhoto({ imageDataUrl, fileName: selectedFile.name }, token);
      setAnalysisImageUrl(imageDataUrl);
      setMatchResult(response);
      toast({
        title: "Analysis ready",
        description: response.savedUpload
          ? `Analyzed ${response.detectedObjects.length} object${response.detectedObjects.length === 1 ? "" : "s"} and saved the upload to your dashboard.`
          : `Analyzed ${response.detectedObjects.length} object${response.detectedObjects.length === 1 ? "" : "s"} from this room photo.`,
      });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to analyze this room photo right now.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToCart = async (object: MatchedRoomObject, match: RoomMatch) => {
    if (cartUrls.has(match.url)) {
      toast({
        title: "Already in cart",
        description: "That purchase link is already saved in your room cart.",
      });
      return;
    }

    try {
      await saveItems([...cartItems, createCartItem(object, match)]);
      toast({
        title: "Added to cart",
        description: isSignedIn ? "This purchase link was saved to your account." : "Open Room Cart to review it or sign in to keep it.",
      });
    } catch (error) {
      toast({
        title: "Cart save failed",
        description: error instanceof Error ? error.message : "Unable to save your room cart right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Shop Objects From Your <span className="text-gradient-warm">Room Photo</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-body leading-relaxed">
              Upload one room photo and EasyDesign will detect the main furniture or decor and find visual shopping matches in one pass.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" asChild>
                <Link to="/room-cart">
                  <ShoppingCart className="h-4 w-4" />
                  View Room Cart
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-3xl border-border/70 shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-2xl">One-Click Room Analysis</CardTitle>
                <CardDescription>
                  Object detection and product matching now run together from a single upload.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={getServiceBadgeVariant(Boolean(status?.services.cloudinary))}>Cloudinary</Badge>
                  <Badge variant={getServiceBadgeVariant(Boolean(status?.services.roboflow))}>Roboflow</Badge>
                  <Badge variant={getServiceBadgeVariant(Boolean(status?.services.serpApi))}>SerpApi Lens</Badge>
                  <Badge variant={getServiceBadgeVariant(Boolean(status?.services.googleVision))}>Google Vision</Badge>
                </div>

                <div className="rounded-2xl border border-dashed border-primary/30 bg-accent/40 p-5">
                  <label className="block text-sm font-medium text-foreground mb-3">Choose a room image</label>
                  <Input key={fileInputKey} type="file" accept="image/*" onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground mt-3">
                    Best results come from one clear room photo where the main furniture is fully visible. Detection runs Roboflow first, then Google Vision, and only uses extra recovery checks as a last-resort pass.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="gradient-warm text-primary-foreground shadow-warm"
                    onClick={handleAnalyzePhoto}
                    disabled={isAnalyzing || statusLoading || !selectedFile || status?.ready === false}
                  >
                    {isAnalyzing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
                    {isAnalyzing ? "Analyzing..." : "Analyze Photo"}
                  </Button>
                  <Button variant="ghost" size="lg" onClick={reset} disabled={isAnalyzing}>
                    Reset
                  </Button>
                </div>

                {status?.notes?.length ? (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    {status.notes.map((note) => (
                      <div key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/70 shadow-card overflow-hidden">
              <CardHeader>
                <CardTitle className="font-display text-2xl">Selected Photo</CardTitle>
                <CardDescription>The app resizes the image in the browser first so uploads stay light.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl overflow-hidden border border-border bg-muted/30 min-h-[320px] flex items-center justify-center">
                  {analysisImageUrl || previewUrl ? (
                    <img src={analysisImageUrl || previewUrl || undefined} alt="Selected room preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center px-6 py-10 text-muted-foreground">
                      <ImageUp className="w-10 h-10 mb-3 text-primary/70" />
                      <p className="font-medium text-foreground">No room photo selected yet</p>
                      <p className="text-sm mt-2 max-w-sm">Upload a room image and matching results will appear after analysis.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {matchResult ? (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto mt-10 space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-foreground">Detected Objects and Matches</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Provider: {matchResult.detectionProvider}. Search mode: {matchResult.searchProvider}.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit">
                  {matchResult.detectedObjects.length} object{matchResult.detectedObjects.length === 1 ? "" : "s"} analyzed
                </Badge>
              </div>

              <div className="space-y-4">
                  {matchResult.warnings.length > 0 ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                      {matchResult.warnings.map((warning) => (
                        <p key={warning} className="text-sm text-muted-foreground">{warning}</p>
                      ))}
                    </div>
                  ) : null}

                  {matchResult.detectedObjects.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                      No strong objects or matches were returned for this photo.
                    </div>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      {matchResult.detectedObjects.map((object, index) => (
                        <motion.div key={object.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                          <Card className="rounded-3xl h-full overflow-hidden border-border/70">
                            <div className="aspect-[4/3] overflow-hidden bg-muted/40">
                              {object.cropImageUrl || localCropUrls[object.id] ? (
                                <img src={object.cropImageUrl || localCropUrls[object.id]} alt={`${object.label} crop`} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Generating preview...</div>
                              )}
                            </div>
                            <CardHeader className="space-y-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <CardTitle className="font-display text-xl capitalize">{object.label}</CardTitle>
                                  <CardDescription>
                                    Confidence {Math.round(object.confidence * 100)}%
                                    {object.rawLabel.toLowerCase() !== object.label.toLowerCase() ? ` - detected as ${object.rawLabel}` : ""}
                                  </CardDescription>
                                </div>
                                <Badge variant="outline" className="capitalize">{getMatchModeLabel(object.matchMode)}</Badge>
                              </div>
                              {object.searchQuery ? (
                                <div className="rounded-2xl bg-accent/60 p-3 text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Fallback query:</span> {object.searchQuery}
                                </div>
                              ) : null}
                              {object.webEntities.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {object.webEntities.map((entity) => (
                                    <Badge key={`${object.id}-${entity}`} variant="secondary" className="font-normal">{entity}</Badge>
                                  ))}
                                </div>
                              ) : null}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {object.matches.map((match) => {
                                const isInCart = cartUrls.has(match.url);

                                return (
                                  <div
                                    key={`${object.id}-${match.url}`}
                                    className="flex flex-col gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/30 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <a
                                      href={match.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex min-w-0 flex-1 items-center gap-3"
                                    >
                                      {match.thumbnailUrl ? (
                                        <img src={match.thumbnailUrl} alt={match.title} className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" loading="lazy" />
                                      ) : (
                                        <div className="w-14 h-14 rounded-xl border border-border bg-muted/40 flex items-center justify-center shrink-0">
                                          {match.kind === "product" ? <PackageSearch className="w-5 h-5 text-primary" /> : match.kind === "store" || match.kind === "shopping" ? <ShoppingBag className="w-5 h-5 text-primary" /> : <Search className="w-5 h-5 text-primary" />}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                          {match.kind === "product" || match.kind === "store" || match.kind === "shopping" ? <ShoppingBag className="w-4 h-4 text-primary shrink-0" /> : <Search className="w-4 h-4 text-primary shrink-0" />}
                                          <span className="truncate">{match.source}</span>
                                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{match.title}</p>
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                          {match.provider ? <Badge variant="secondary" className="font-normal">{match.provider}</Badge> : null}
                                          {formatMatchPrice(match) ? <Badge variant="outline" className="font-normal">{formatMatchPrice(match)}</Badge> : null}
                                          {match.inStock === true ? <Badge variant="secondary" className="font-normal">In stock</Badge> : null}
                                        </div>
                                      </div>
                                    </a>
                                    <Button
                                      type="button"
                                      variant={isInCart ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={() => void handleAddToCart(object, match)}
                                      disabled={isInCart || cartSaving}
                                      className="sm:shrink-0"
                                    >
                                      <ShoppingCart className="h-4 w-4" />
                                      {isInCart ? "Added" : "Add"}
                                    </Button>
                                  </div>
                                );
                              })}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
              </div>
            </motion.section>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RoomShop;
