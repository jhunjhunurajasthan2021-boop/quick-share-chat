import { useRoute, Link } from "wouter";
import { useFile } from "@/hooks/use-files";
import { ChatRoom } from "@/components/ChatRoom";
import { Loader2, Download, Copy, Clock, FileText, ArrowLeft, AlertCircle } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Share() {
  const [match, params] = useRoute("/share/:publicId");
  const publicId = params?.publicId || "";
  const { data: file, isLoading, error } = useFile(publicId);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // Countdown timer logic
  useEffect(() => {
    if (!file) return;

    const updateTimer = () => {
      const expiry = new Date(file.expiresAt);
      if (isPast(expiry)) {
        setTimeLeft("Expired");
      } else {
        setTimeLeft(formatDistanceToNow(expiry, { addSuffix: true }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [file]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (file) {
      // If the link is relative, use it as a download link
      const downloadUrl = file.fileIoLink.startsWith('/') 
        ? `${window.location.origin}${file.fileIoLink}`
        : file.fileIoLink;
      window.open(downloadUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4 font-display">File Not Found</h1>
          <p className="text-muted-foreground mb-8">
            This file may have expired or the link is incorrect. Files are automatically deleted after 2 hours.
          </p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Upload New File
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft === "Expired";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="text-xl font-bold font-display text-primary">PrivLink</div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: File Details */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden"
            >
              <div className="p-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-2 break-all font-display">
                  {file.filename}
                </h1>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{file.mimeType}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleDownload}
                    disabled={isExpired}
                    className="
                      w-full py-4 px-6 rounded-xl font-bold text-lg
                      bg-primary text-primary-foreground
                      hover:bg-primary/90 active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-lg shadow-primary/20 hover:shadow-primary/40
                      transition-all flex items-center justify-center gap-3
                    "
                  >
                    <Download className="w-5 h-5" />
                    {isExpired ? "File Expired" : "Download File"}
                  </button>
                  
                  <button
                    onClick={handleCopyLink}
                    className="
                      w-full py-3 px-6 rounded-xl font-semibold
                      bg-white border border-border text-foreground
                      hover:bg-slate-50 active:scale-[0.98]
                      transition-all flex items-center justify-center gap-3
                    "
                  >
                    {copied ? (
                      <>Copied!</>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Share Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Footer */}
              <div className="bg-slate-50 p-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expires {timeLeft === "Expired" ? "now" : `in ${timeLeft}`}</span>
                </div>
                <div className="text-xs text-muted-foreground px-2 py-1 bg-white border border-border rounded-md">
                  Public ID: {file.publicId.slice(0, 8)}
                </div>
              </div>
            </motion.div>

            {/* Safety Notice */}
            <div className="space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                <div className="p-1 bg-blue-100 rounded-full text-blue-600 mt-0.5">
                  <ShieldIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 text-sm">Security Notice</h4>
                  <p className="text-blue-700/80 text-xs mt-1 leading-relaxed">
                    This file is hosted temporarily. Ensure you trust the sender before downloading. 
                    The file will be permanently deleted when the timer expires.
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
                <div className="p-1 bg-amber-100 rounded-full text-amber-600 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm">Legal Disclaimer</h4>
                  <p className="text-amber-700/80 text-xs mt-1 leading-relaxed">
                    User is responsible for uploaded content.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <ChatRoom publicId={publicId} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
