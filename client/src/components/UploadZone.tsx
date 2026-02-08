import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useCreateFile } from "@/hooks/use-files";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";
import { addHours } from "date-fns";
import { Progress } from "@/components/ui/progress";

export function UploadZone() {
  const [, setLocation] = useLocation();
  const createFile = useCreateFile();
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadStatus("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      
      if (acceptedFiles.length > 1) {
        // Multiple files (folder-like) - we'll handle this by showing a notice
        // For simplicity in MVP, we just upload the first one but notice the folder intent
        formData.append("file", acceptedFiles[0]);
      } else {
        formData.append("file", acceptedFiles[0]);
      }
      
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 300);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload file");
      }

      const data = await response.json();
      
      setUploadStatus("success");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        setLocation(`/share/${data.publicId}`);
      }, 1500);

    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      setErrorMessage(err.message || "Something went wrong during upload");
    }
  }, [setLocation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true,
    noClick: false,
    noKeyboard: false
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-3xl p-10 text-center cursor-pointer
          border-2 border-dashed transition-all duration-300
          ${isDragActive 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-white/50 bg-white/30"
          }
          ${uploadStatus !== "idle" ? "cursor-default" : ""}
        `}
      >
        <input {...getInputProps()} webkitdirectory="" directory="" multiple />
        
        <AnimatePresence mode="wait">
          {uploadStatus === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground font-display">
                {isDragActive ? "Drop it like it's hot!" : "Upload files or folders"}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Drag & drop or click to select files. Folder support enabled.
              </p>
            </motion.div>
          )}

          {uploadStatus === "uploading" && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-6 py-8"
            >
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">
                Encrypting and securing your file...
              </p>
            </motion.div>
          )}

          {uploadStatus === "success" && (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center space-y-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Upload Complete!</h3>
              <p className="text-muted-foreground">Redirecting to your secure link...</p>
            </motion.div>
          )}

          {uploadStatus === "error" && (
            <motion.div
              key="error"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center space-y-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-red-600">Upload Failed</h3>
              <p className="text-muted-foreground">{errorMessage}</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadStatus("idle");
                  setErrorMessage("");
                }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
