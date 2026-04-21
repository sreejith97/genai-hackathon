"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, Message } from "./ChatMessage";

import { useState } from "react";

export function ChatLayout() {
  const [localInput, setLocalInput] = useState("");
  
  const chatHelpers = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        persona: "helpful and highly intelligent AI assistant",
      },
    }),
    onError: (e) => {
      console.error("useChat Error:", e.message);
    }
  });

  const { messages, sendMessage, status, error } = chatHelpers;
  const isLoading = status === "streaming" || status === "submitted";

  const onHandleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!localInput.trim()) return;
    
    const messageContent = localInput;
    setLocalInput(""); // Clear immediately for UX
    
    try {
      await sendMessage({ text: messageContent });
    } catch (err) {
      console.error("Failed to send message:", err);
      setLocalInput(messageContent); // Restore on error
    }
  };

  const onLocalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto rounded-3xl overflow-hidden glass shadow-2xl border border-white/5 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
              AI Copilot
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Systems Online
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-6 relative">
        <div className="flex flex-col gap-6 pb-4">
          {(messages?.length ?? 0) === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 opacity-50 animate-in fade-in zoom-in duration-700">
              <Sparkles className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">How can I help you today?</p>
                <p className="text-sm text-muted-foreground">Type a message to start exploring.</p>
              </div>
            </div>
          )}
          
          {messages?.map((msg) => (
            <ChatMessage key={msg.id} message={msg as Message} />
          ))}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center mx-12">
              Error: {error.message}
            </div>
          )}

          {isLoading && messages && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-6 pt-2 bg-gradient-to-t from-background via-background/90 to-transparent sticky bottom-0 z-10">
        <form
          onSubmit={onHandleSubmit}
          className="relative flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-inner"
        >
          <input
            autoFocus
            value={localInput}
            onChange={onLocalInputChange}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent border-none shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-6 px-4 text-foreground placeholder:text-muted-foreground relative z-20"
          />
          <Button 
            disabled={isLoading || (localInput?.length ?? 0) === 0} 
            type="submit" 
            size="icon"
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 transition-all duration-300 mb-0.5"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-4 font-mono opacity-50">
          Powered by Next.js, LangChain, and xAI Grok
        </p>
      </div>

    </div>
  );
}


