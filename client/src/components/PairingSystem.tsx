import { useState } from "react";
import { usePairing } from "@/hooks/use-pairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Send,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Wifi,
  UserCheck,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/UploadZone";

export function PairingSystem() {
  const [username] = useState(() => `User-${Math.floor(Math.random() * 1000)}`);
  const { 
    pairingCode, 
    isPaired, 
    messages, 
    error, 
    nearbyDevices,
    incomingRequest,
    outgoingRequest,
    discoverable,
    generateCode, 
    joinPairing, 
    requestConnection,
    respondToConnectionRequest,
    setDiscoverable,
    sendPairMessage 
  } = usePairing(username);
  
  const [inputCode, setInputCode] = useState("");
  const [chatInput, setChatInput] = useState("");

  if (isPaired) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-primary/20 bg-white/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b bg-white/80">
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
          <div className="flex flex-col md:flex-row h-[600px]">
            {/* Chat Section */}
            <div className="flex-1 flex flex-col border-r border-border/50">
              <div className="p-3 bg-muted/30 border-b">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Secure Chat
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/30">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground italic text-sm">
                    Connected! Send a message or file...
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isFile = msg.content.includes("Download link:");
                  const parts = isFile ? msg.content.split("\n") : [msg.content];
                  
                  return (
                    <div key={i} className={`flex flex-col ${msg.senderName === username ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[90%] rounded-2xl px-4 py-2 shadow-sm ${
                        msg.senderName === username 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-white border text-foreground'
                      }`}>
                        {isFile ? (
                          <div className="space-y-2 py-1">
                            <p className="text-sm font-medium border-b border-white/20 pb-1 mb-1">{parts[0]}</p>
                            <a 
                              href={parts[1].split(": ")[1]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`text-xs flex items-center gap-2 p-2 rounded-lg transition-colors ${
                                msg.senderName === username 
                                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                                  : 'bg-primary/10 hover:bg-primary/20 text-primary'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Click to Download File
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{msg.senderName}</span>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t bg-white/50">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (chatInput.trim()) {
                      sendPairMessage(chatInput);
                      setChatInput("");
                    }
                  }}
                  className="flex gap-2"
                >
                  <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="rounded-full bg-white border-primary/20"
                    data-testid="input-chat"
                  />
                  <Button type="submit" size="icon" className="rounded-full shadow-md">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="w-full md:w-80 bg-muted/10 p-4 flex flex-col">
              <div className="mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4" />
                  Quick Share
                </h4>
                <p className="text-[11px] text-muted-foreground">Files sent here appear in the chat instantly.</p>
              </div>
              <div className="flex-1">
                <UploadZone 
                  compact 
                  onUploadComplete={(data) => {
                    const fileLink = `${window.location.origin}/api/download/${data.publicId}`;
                    sendPairMessage(`Shared a file: ${data.filename}\nDownload link: ${fileLink}`);
                  }}
                />
              </div>
              <div className="mt-4 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <p className="text-[10px] text-blue-600 font-medium text-center leading-relaxed">
                  Tip: Both devices must stay connected to see updates in real-time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog
        open={Boolean(incomingRequest)}
        onOpenChange={(open) => {
          if (!open && incomingRequest) {
            respondToConnectionRequest(incomingRequest.requestId, false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              Connection permission requested
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{incomingRequest?.from.name}</strong>{" "}
              ({incomingRequest?.from.deviceType}) wants to connect with your device.
              Allow only if you recognize this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (incomingRequest) respondToConnectionRequest(incomingRequest.requestId, false);
            }}>
              Deny
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (incomingRequest) respondToConnectionRequest(incomingRequest.requestId, true);
            }}>
              Allow & Connect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="border-blue-200/70 bg-white/70 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Wifi className="w-5 h-5 text-blue-600" />
                  Nearby devices
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Devices using PrivLink on the same internet or Wi-Fi will appear here.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2">
                <div className="text-right">
                  <p className="text-xs font-semibold text-blue-900">Show my device</p>
                  <p className="text-[11px] text-blue-700/70">
                    {discoverable ? "Visible to nearby devices" : "Hidden from nearby devices"}
                  </p>
                </div>
                <Switch
                  checked={discoverable}
                  onCheckedChange={setDiscoverable}
                  aria-label="Show my device to nearby devices"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {nearbyDevices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center">
                <Wifi className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-900">Looking for available devices...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open PrivLink on another device and keep “Show my device” enabled.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {nearbyDevices.map((device) => {
                  const DeviceIcon = device.deviceType === "Mobile" || device.deviceType === "Tablet"
                    ? Smartphone
                    : Laptop;
                  return (
                    <div
                      key={device.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-white p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                        <DeviceIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.deviceType} · Online</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => requestConnection(device.id)}
                        disabled={Boolean(outgoingRequest) || isPaired}
                        className="shrink-0 rounded-lg"
                      >
                        {outgoingRequest?.targetName === device.name ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Waiting
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {error && (
              <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              For your safety, the other device must approve the connection before sharing starts.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
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
      </div>
    </>
  );
}
