import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { type UIMessage } from "ai";

export type Message = UIMessage;

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  // In AI SDK 5, content is in parts
  const content = message.parts
    ? message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("")
    : (message as any).content || "";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-4 p-4 animate-in-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className={cn("h-10 w-10 border shadow-sm shrink-0", isUser ? "border-primary/50" : "border-border")}>
        {isUser ? (
          <>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="" />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              <Bot className="w-5 h-5" />
            </AvatarFallback>
          </>
        )}
      </Avatar>
      
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[85%] md:max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5 text-sm md:text-base leading-relaxed shadow-sm transition-all",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "glass-card text-foreground rounded-tl-sm border border-border/40"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
