import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Mic, Bot, User } from "lucide-react";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

const quickActions = [
  "Summarize my data",
  "Find correlations", 
  "Predict churn risk",
  "Create forecast"
];

export function ChatInterface({ messages, onSendMessage, isLoading = false }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    
    try {
      await onSendMessage(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
    
    // Focus back to input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg rounded-tl-none p-4 max-w-2xl">
                <p className="text-gray-900 dark:text-white">
                  Hi! I'm Mono-AI, your data assistant. I can help you analyze your data, create visualizations, and answer questions about your dataset. What would you like to explore?
                </p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-3",
                message.role === "user" ? "justify-end" : ""
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80">
                  <AvatarFallback>
                    <Bot className="w-4 h-4 text-white" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "rounded-lg p-4 max-w-3xl",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none"
                )}
              >
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      // Handle numbered sections with proper spacing
                      .replace(/(\d+\.\s+)([^*\n]+)/g, '<div class="mb-4 mt-6"><span class="font-semibold text-gray-900 dark:text-white">$1$2</span></div>')
                      // Handle bold bullet points with consistent spacing
                      .replace(/\* \*\*(.*?)\*\*/g, '<div class="flex items-start gap-3 mb-4 mt-3"><span class="text-orange-500 mt-1 text-base font-medium">•</span><div class="flex-1"><div class="font-semibold text-gray-900 dark:text-white mb-2">$1</div></div></div>')
                      // Handle regular bullet points with consistent spacing
                      .replace(/\* ([^*\n][^\n]*)/g, '<div class="flex items-start gap-3 mb-3 mt-2"><span class="text-orange-500 mt-1 font-medium">•</span><div class="flex-1 text-gray-700 dark:text-gray-300">$1</div></div>')
                      // Handle section headers
                      .replace(/^([A-Z][^:\n]*:)\s*$/gm, '<div class="mt-6 mb-4 font-semibold text-gray-900 dark:text-white text-base">$1</div>')
                      // Handle double line breaks for paragraph spacing
                      .replace(/\n\n/g, '<div class="h-4"></div>')
                      // Handle single line breaks
                      .replace(/\n/g, '<br>')
                      // Handle remaining bold text
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
                  }}
                />
                
                {message.metadata?.chart && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-border">
                    <h4 className="font-semibold text-base mb-3 text-gray-900 dark:text-white">{message.metadata.chart.title}</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {message.metadata.chart.analysis}
                    </div>
                  </div>
                )}
                

              </div>
              
              {message.role === "user" && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80">
                <AvatarFallback>
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg rounded-tl-none p-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 border-t border-border">
          <div className="flex flex-wrap gap-2 mb-4">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="text-sm"
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your data..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </Button>
          <Button 
            variant="outline"
            size="icon"
            title="Voice input"
            disabled={isLoading}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
