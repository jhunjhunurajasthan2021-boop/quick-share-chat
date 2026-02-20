import { useState } from "react";
import { usePairing } from "@/hooks/use-pairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Smartphone, Laptop, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/UploadZone";

export function PairingSystem() {
  const [username] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const { 
    pairingCode, 
    isPaired, 
    messages, 
    error, 
    generateCode, 
    joinPairing, 
    sendPairMessage 
  } = usePairing(username);
  
  const [inputCode, setInputCode] = useState("");
  const [chatInput, setChatInput] = useState("");

  if (isPaired) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-primary/20 bg-white/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Devices Connected
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <div className="h-px w-4 bg-border" />
            <Laptop className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 text-muted-foreground italic">
                  Start chatting or share files...
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.senderName === username ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.senderName === username 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.senderName}</span>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t bg-white/30">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    sendPairMessage(chatInput);
                    setChatInput("");
                  }
                }}
                className="flex gap-2 mb-4"
              >
                <Input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="rounded-full bg-white/50"
                  data-testid="input-chat"
                />
                <Button type="submit" size="icon" className="rounded-full" data-testid="button-send">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="pt-4 border-t border-dashed">
                <p className="text-xs font-semibold text-muted-foreground mb-3 text-center uppercase tracking-wider">Quick File Share</p>
                <UploadZone 
                  compact 
                  onUploadComplete={(data) => {
                    const fileLink = `${window.location.origin}/api/download/${data.publicId}`;
                    sendPairMessage(`Shared a file: ${data.filename}\nDownload link: ${fileLink}`);
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto">
      <Card className="border-primary/10 hover-elevate transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Sender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a code to connect with another device.
          </p>
          {pairingCode ? (
            <div className="text-center space-y-2">
              <div className="text-4xl font-mono font-bold tracking-[0.2em] py-6 bg-primary/5 rounded-xl text-primary">
                {pairingCode}
              </div>
              <p className="text-xs text-muted-foreground animate-pulse">
                Waiting for partner to connect...
              </p>
            </div>
          ) : (
            <Button onClick={generateCode} className="w-full rounded-xl py-6 text-lg font-medium">
              Generate Code
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/10 hover-elevate transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="w-5 h-5" />
            Receiver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the code from another device to start sharing.
          </p>
          <div className="space-y-2">
            <Input 
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              className="text-center text-xl font-mono tracking-[0.2em] h-14 rounded-xl"
              maxLength={6}
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
            <Button 
              onClick={() => joinPairing(inputCode)} 
              disabled={inputCode.length !== 6}
              variant="outline"
              className="w-full rounded-xl py-6 text-lg font-medium"
            >
              Connect Devices
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
