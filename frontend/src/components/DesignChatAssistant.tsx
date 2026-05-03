import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, ExternalLink, RefreshCcw, SendHorizonal, Sparkles, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  sendDesignAssistantTurn,
  type DesignAssistantAction,
  type DesignAssistantQuickReply,
  type DesignAssistantResponse,
  type DesignAssistantState,
} from "@/lib/designAssistant";
import type { Inspiration } from "@/lib/designs";
import { getInspirationPreview } from "@/lib/previewImages";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  inspirations?: Inspiration[];
  roomSlug?: string | null;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatSelectedItems(items: string[]) {
  if (items.length === 0) {
    return "No items selected yet";
  }

  if (items.length <= 3) {
    return items.join(", ");
  }

  return `${items.slice(0, 3).join(", ")} +${items.length - 3} more`;
}

const DesignChatAssistant = () => {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantState, setAssistantState] = useState<DesignAssistantState | null>(null);
  const [quickReplies, setQuickReplies] = useState<DesignAssistantQuickReply[]>([]);
  const [roomLabel, setRoomLabel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, quickReplies]);

  const selectedItems = assistantState?.selectedItems || [];
  const summaryText = useMemo(() => formatSelectedItems(selectedItems), [selectedItems]);

  async function requestAssistantTurn({
    message,
    action,
    userFacingText,
    resetThread = false,
  }: {
    message?: string;
    action?: DesignAssistantAction;
    userFacingText?: string;
    resetThread?: boolean;
  }) {
    if (loading) {
      return;
    }

    if (userFacingText) {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "user",
          content: userFacingText,
        },
      ]);
    }

    setLoading(true);

    try {
      const response = await sendDesignAssistantTurn(
        {
          message,
          action,
          state: resetThread ? null : assistantState,
        },
        token
      );

      applyAssistantResponse(response, resetThread);
    } catch (error) {
      toast({
        title: "Chatbot unavailable",
        description: error instanceof Error ? error.message : "Unable to talk to the design assistant right now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function applyAssistantResponse(response: DesignAssistantResponse, resetThread: boolean) {
    setAssistantState(response.state);
    setQuickReplies(response.quickReplies);
    setRoomLabel(response.room?.label || null);
    setMessages((prev) => {
      const nextMessages = resetThread ? [] : prev;
      return [
        ...nextMessages,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.assistantMessage,
          inspirations: response.inspirations,
          roomSlug: response.room?.slug || null,
        },
      ];
    });

    if (response.savedDesign) {
      toast({
        title: "Chat design saved",
        description: "This chatbot design search was added to your dashboard.",
      });
    } else if (response.didGenerateResults && !user) {
      toast({
        title: "Links ready",
        description: "Sign in if you want chatbot searches saved to your dashboard.",
      });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapChat() {
      setMessages([]);
      setAssistantState(null);
      setQuickReplies([]);
      setRoomLabel(null);
      setLoading(true);

      try {
        const response = await sendDesignAssistantTurn({}, token);
        if (!isMounted) {
          return;
        }
        applyAssistantResponse(response, true);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        toast({
          title: "Chatbot unavailable",
          description: error instanceof Error ? error.message : "Unable to start the design assistant right now.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void bootstrapChat();

    return () => {
      isMounted = false;
    };
  }, [toast, token]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setInput("");
    await requestAssistantTurn({
      message: trimmed,
      userFacingText: trimmed,
    });
  };

  const handleQuickReply = async (reply: DesignAssistantQuickReply) => {
    await requestAssistantTurn({
      action: reply.action,
      userFacingText: reply.label,
      resetThread: reply.action.kind === "reset",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="border-border/70 shadow-card overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-card/80">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Bot className="h-3.5 w-3.5" />
                AI Chat Designer
              </div>
              <CardTitle className="font-display text-2xl">Plan a room by chatting</CardTitle>
              <CardDescription>
                Tell the bot which room you want, add furniture or decor, and it will return Pinterest search links.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void requestAssistantTurn({ action: { kind: "reset" }, userFacingText: "Start over", resetThread: true })}
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[560px]">
            <div className="space-y-4 p-5">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[90%] ${message.role === "assistant" ? "" : "items-end"}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {message.role === "assistant" ? (
                        <>
                          <Bot className="h-3.5 w-3.5" />
                          <span>EasyDesign Bot</span>
                        </>
                      ) : (
                        <>
                          <User2 className="h-3.5 w-3.5" />
                          <span>You</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === "assistant"
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.inspirations && message.inspirations.length > 0 && (
                      <div className="mt-4 grid gap-4">
                        {message.inspirations.map((item, index) => (
                          <motion.a
                            key={`${message.id}-${item.title}-${index}`}
                            href={item.pinterestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ y: -3 }}
                            className="overflow-hidden rounded-2xl border border-border bg-background transition-all duration-200 hover:border-primary/30 hover:shadow-card"
                          >
                            <img
                              src={getInspirationPreview(message.roomSlug || item.previewKey, index, item.kind)}
                              alt={item.title}
                              className="h-40 w-full object-cover"
                              loading="lazy"
                            />
                            <div className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-display text-lg font-semibold text-foreground">{item.title}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                                </div>
                                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              </div>
                              <div className="rounded-xl bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
                                Search query: {item.searchQuery}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                  <span
                                    key={`${item.title}-${tag}`}
                                    className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    Thinking about your room...
                  </div>
                </div>
              )}

              <div ref={scrollBottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border/70 bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <Button
                  key={`${reply.action.kind}-${reply.action.value || reply.label}`}
                  variant={reply.action.kind === "submit" ? "default" : "outline"}
                  size="sm"
                  disabled={loading}
                  onClick={() => void handleQuickReply(reply)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Try: living room with sofa, coffee table, and plants"
                className="min-h-[96px] resize-none"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button className="sm:h-[96px] sm:px-6" onClick={() => void handleSend()} disabled={loading || !input.trim()}>
                <SendHorizonal className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">Current plan</CardTitle>
            <CardDescription>The chatbot keeps track of the room and items you have chosen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl bg-accent/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Room</p>
              <p className="mt-2 font-display text-xl text-foreground">{roomLabel || "Waiting for your first choice"}</p>
            </div>
            <div className="rounded-2xl bg-accent/35 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected items</p>
              <p className="mt-2 text-foreground">{summaryText}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-muted-foreground">
                  The chatbot writes naturally with OpenRouter when available, but the actual Pinterest links are always built from the app&apos;s room catalog.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">How to use it</CardTitle>
            <CardDescription>Short prompts work best.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Start with a room like "bedroom" or "home office".</p>
            <p>Add what you want, for example "bed, rug, and reading lamp".</p>
            <p>Say "show my links" or tap the quick button when you are ready.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DesignChatAssistant;
