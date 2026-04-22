import { ExternalLink, LoaderCircle, PackageSearch, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoomShopCartItem, RoomShopCartSuggestion } from "@/lib/roomAnalysis";

function buildShoppingSearchUrl(query: string) {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

type RoomShopCartPanelProps = {
  cartItems: RoomShopCartItem[];
  cartSuggestions: RoomShopCartSuggestion[];
  cartLoading: boolean;
  cartSaving: boolean;
  suggestionsLoading: boolean;
  isSignedIn: boolean;
  onClearCart: () => void;
  onGenerateSuggestions: () => void;
  onRemoveItem: (id: string) => void;
};

export default function RoomShopCartPanel({
  cartItems,
  cartSuggestions,
  cartLoading,
  cartSaving,
  suggestionsLoading,
  isSignedIn,
  onClearCart,
  onGenerateSuggestions,
  onRemoveItem,
}: RoomShopCartPanelProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="rounded-3xl border-border/70 shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl">Room Cart</CardTitle>
              <CardDescription>
                {isSignedIn ? "Saved to your account." : "Sign in to save this cart across devices."}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <ShoppingCart className="h-3.5 w-3.5" />
              {cartItems.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartLoading ? (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              Loading your saved cart...
            </div>
          ) : cartItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              Add product matches from Room Shop to keep purchase links together.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
              {cartItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="h-14 w-14 rounded-xl border border-border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/40">
                        <PackageSearch className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {item.label} from {item.source}
                      </p>
                      {item.price?.value ? (
                        <Badge variant="outline" className="mt-2 font-normal">
                          {item.price.value.replace(/\*+$/, "")}
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={cartSaving}
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Purchase Link
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onGenerateSuggestions}
              disabled={cartItems.length === 0 || suggestionsLoading}
            >
              {suggestionsLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {suggestionsLoading ? "Thinking..." : "Suggest Add-ons"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClearCart}
              disabled={cartItems.length === 0 || cartSaving}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-xl">AI Pairing Ideas</CardTitle>
          <CardDescription>Complementary items based on what is in your cart.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cartSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
              Add items to the cart, then generate add-on ideas.
            </div>
          ) : (
            cartSuggestions.map((suggestion) => (
              <a
                key={suggestion.id}
                href={buildShoppingSearchUrl(suggestion.searchQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary" className="mb-2 font-normal">
                      {suggestion.category}
                    </Badge>
                    <p className="font-display text-base font-semibold text-foreground">{suggestion.title}</p>
                  </div>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{suggestion.reason}</p>
                <p className="mt-3 text-xs text-primary">Search: {suggestion.searchQuery}</p>
              </a>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
