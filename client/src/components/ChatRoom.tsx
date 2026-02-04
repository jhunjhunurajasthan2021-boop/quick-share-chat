import { useState, useRef, useEffect } from "react";
import { Send, User, MessageSquare } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface ChatRoomProps {
  publicId: string;
}

export function ChatRoom({ publicId }: ChatRoomProps) {
  const [username, setUsername] = useState(() => {
    // Generate random username if not stored
    return localStorage.getItem("chat_username") || 
      `User-${Math.floor(Math.random() * 1000)}`;
  });
  
  const [inputValue, setInputValue] = useState("");
  const { messages, sendMessage, isConnected } = useChat(publicId, username);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-primary/5 p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Secure Chat</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderName === username;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`
                  max-w-[80%] rounded-2xl px-4 py-2 shadow-sm
                  ${isMe 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-white border border-border rounded-tl-sm'
                  }
                `}>
                  {!isMe && (
                    <div className="text-xs font-bold mb-1 opacity-50">
                      {msg.senderName}
                    </div>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.createdAt ? format(new Date(msg.createdAt), "h:mm a") : "Just now"}
                </span>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a secure message..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected}
            className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
