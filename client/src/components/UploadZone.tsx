import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, CheckCircle2, AlertCircle, Loader2, FolderOpen } from "lucide-react";
import { useCreateFile } from "@/hooks/use-files";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";
import { addHours } from "date-fns";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";

export function UploadZone({ compact = false, onUploadComplete }: { compact?: boolean, onUploadComplete?: (data: any) => void }) {
  const [, setLocation] = useLocation();
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploadStatus("uploading");
    setProgress(10);

    try {
      const formData = new FormData();
      let fileToUpload: Blob | File = acceptedFiles[0];
      let fileName = acceptedFiles[0].name;
      let mimeType = acceptedFiles[0].type || "application/octet-stream";

      if (acceptedFiles.length > 1) {
        // Multiple files or folder - Zip them together
        const zip = new JSZip();
        acceptedFiles.forEach((file) => {
          // Use webkitRelativePath if available for folder structure, else just the name
          const path = (file as any).webkitRelativePath || file.name;
          zip.file(path, file);
        });
        
        fileToUpload = await zip.generateAsync({ type: "blob" }, (metadata) => {
          setProgress(10 + Math.round(metadata.percent * 0.4)); // 10% to 50% for zipping
        });
        fileName = "bundled_files.zip";
        mimeType = "application/zip";
      }
      
      formData.append("file", fileToUpload, fileName);
      
      const progressOffset = acceptedFiles.length > 1 ? 50 : 10;
      const progressScale = acceptedFiles.length > 1 ? 0.5 : 0.9;

      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(progressOffset + Math.round(percent * progressScale));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const error = JSON.parse(xhr.responseText || "{}");
            reject(new Error(error.message || "Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      const data: any = await uploadPromise;
      
      setUploadStatus("success");
      setProgress(100);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      if (onUploadComplete) {
        onUploadComplete(data);
        setTimeout(() => setUploadStatus("idle"), 2000);
      } else {
        setTimeout(() => {
          setLocation(`/share/${data.publicId}`);
        }, 1500);
      }

    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      setErrorMessage(err.message || "Something went wrong during upload");
    }
  }, [setLocation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true,
  });

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-3xl text-center cursor-pointer
          border-2 border-dashed transition-all duration-300
          ${compact ? "p-4" : "p-10"}
          ${isDragActive 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-white/50 bg-white/30"
          }
          ${uploadStatus !== "idle" ? "cursor-default" : ""}
        `}
        data-testid="dropzone"
      >
        <input {...getInputProps()} data-testid="input-file" />
        
        <AnimatePresence mode="wait">
          {uploadStatus === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex flex-col items-center justify-center ${compact ? "space-y-2" : "space-y-4"}`}
            >
              <div className={`flex gap-4 ${compact ? "mb-0" : "mb-2"}`}>
                <div className={`${compact ? "w-10 h-10" : "w-16 h-16"} rounded-full bg-primary/10 flex items-center justify-center`}>
                  <Upload className={`${compact ? "w-5 h-5" : "w-8 h-8"} text-primary`} />
                </div>
                {!compact && (
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-blue-500" />
                  </div>
                )}
              </div>
              <h3 className={`${compact ? "text-base" : "text-2xl"} font-bold text-foreground font-display`}>
                {isDragActive ? "Drop it!" : compact ? "Drop files to share" : "Upload files or folders"}
              </h3>
              {!compact && (
                <p className="text-muted-foreground max-w-xs mx-auto">
                  Drag & drop files/folders, or click to select. 
                  Supports all file types (JPG, ZIP, PDF, PSD, etc.)
                </p>
              )}
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
