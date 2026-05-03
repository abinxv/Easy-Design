import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Lightbulb, RefreshCcw, Ruler, SendHorizonal, User2, Wand2 } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import heroLivingRoom from "@/assets/hero-living-room.jpg";
import { useAuth } from "@/lib/auth";
import { sendAiChatbotTurn, type AiChatbotMessage } from "@/lib/aiChatbot";

type ChatMessage = AiChatbotMessage & {
  id: string;
  seed?: boolean;
};

const starterPrompts = [
  "What type of furniture should I get for my kids room?"
];

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    seed: true,
    content:
      "Hi, I'm your EasyDesign AI chatbot. Ask me about room layouts, colors, furniture, lighting, decor, or what to search for next.",
  };
}

const AiChatbot = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);

  const apiMessages = useMemo(
    () =>
      messages
        .filter((message) => !message.seed)
        .map(({ role, content }) => ({
          role,
          content,
        })),
    [messages]
  );

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resetChat = () => {
    setMessages([createWelcomeMessage()]);
    setInput("");
  };

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };
    const nextApiMessages = [...apiMessages, { role: "user" as const, content: trimmed }];

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendAiChatbotTurn({ messages: nextApiMessages }, token);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          content: response.assistantMessage,
        },
      ]);
    } catch (error) {
      toast({
        title: "AI chatbot unavailable",
        description: error instanceof Error ? error.message : "Unable to reach the AI chatbot right now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await submitMessage(input);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-8 max-w-3xl text-center"
          >
            <h1 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              AI <span className="text-gradient-warm">Chatbot</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Talk through design decisions, compare styles, and turn rough room ideas into a practical next move.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden rounded-3xl border-border/70 shadow-card">
              <CardHeader className="border-b border-border/70 bg-card/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      <Bot className="h-4 w-4" />
                      EasyDesign Chat
                    </div>
                    <CardTitle className="font-display text-2xl">Ask anything about your space</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetChat} disabled={loading}>
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
                        <div className="max-w-[90%]">
                          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {message.role === "assistant" ? (
                              <>
                                <Bot className="h-3.5 w-3.5" />
                                <span>EasyDesign AI</span>
                              </>
                            ) : (
                              <>
                                <User2 className="h-3.5 w-3.5" />
                                <span>You</span>
                              </>
                            )}
                          </div>
                          <div
                            className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                              message.role === "assistant"
                                ? "bg-muted text-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}

                    {loading ? (
                      <div className="flex justify-start">
                        <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                          Thinking through the design...
                        </div>
                      </div>
                    ) : null}

                    <div ref={scrollBottomRef} />
                  </div>
                </ScrollArea>

                <div className="border-t border-border/70 bg-card/60 p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => void submitMessage(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask about palettes, layouts, furniture, lighting, or shopping search terms"
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
              <Card className="overflow-hidden rounded-3xl border-border/70 shadow-card">
                <div className="relative h-56 overflow-hidden">
                  <img src={heroLivingRoom} alt="Warm living room inspiration" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-foreground/25" />
                </div>
                <CardContent className="space-y-4 p-5">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-start gap-3 rounded-2xl bg-accent/45 p-4">
                      <Ruler className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Layouts, measurements, and furniture placement</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-accent/45 p-4">
                      <Lightbulb className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Lighting, color palettes, materials, and mood</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-accent/45 p-4">
                      <Wand2 className="mt-0.5 h-4 w-4 text-primary" />
                      <span>Search terms for products, decor, and inspiration</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AiChatbot;
