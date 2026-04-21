"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle, CheckCircle2, FileText, HelpCircle,
  Activity, Copy, Clock, Mic, MicOff, Loader2,
  UploadCloud, X, FileImage
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "../ui/textarea";

interface AnalysisResults {
  extraction: {
    symptoms: string[];
    duration?: string;
    severity?: string;
    dismissedConcerns: string[];
    doctorActions: string[];
    missingTests: string[];
  };
  validation: string;
  questions: string;
  letter: string;
  timeline: { date: string; event: string }[];
}

// Extend Window type for SpeechRecognition and PDF.js
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    pdfjsLib: any;
  }
}

// Dynamically inject PDF.js from unpkg CDN
const loadPdfJs = async (): Promise<any> => {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js library"));
    document.head.appendChild(script);
  });
};

type InputMode = "text" | "file";

export default function AdvocateApp() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) setRecordingSupported(true);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied({ ...isCopied, [id]: true });
    setTimeout(() => setIsCopied({ ...isCopied, [id]: false }), 2000);
  };

  // ── Voice ────────────────────────────────────────────────────────────────────
  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = input;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setInput(finalTranscript + interim);
    };
    recognition.onerror = () => { setIsRecording(false); setIsTranscribing(false); };
    recognition.onend = () => { setIsRecording(false); setIsTranscribing(false); setInput(finalTranscript.trim()); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) { setIsTranscribing(true); recognitionRef.current.stop(); }
  };

  // ── File Upload ───────────────────────────────────────────────────────────────
  const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  const handleFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file. Please upload a PDF, JPG, PNG, or WEBP.");
      return;
    }
    setUploadedFile(file);
    setExtractedPreview("");
    setError("");
    setIsExtracting(true);

    try {
      if (file.type === "application/pdf") {
        // Client-side PDF extraction using PDF.js
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n";
        }

        if (!fullText.trim()) {
          throw new Error("This PDF appears to be a scanned image-only document. Please upload the report as an image (JPG/PNG) instead.");
        }

        setExtractedPreview(fullText.trim());
        setInput(fullText.trim());
      } else {
        // Server-side Image extraction using Vision AI
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract-file", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed.");

        setExtractedPreview(data.text);
        setInput(data.text);
      }
    } catch (err: any) {
      setError(err.message);
      setUploadedFile(null);
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearFile = () => {
    setUploadedFile(null);
    setExtractedPreview("");
    setInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Analyze ───────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze.");
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fileIcon = uploadedFile?.type === "application/pdf" ? (
    <FileText className="h-5 w-5 text-red-500" />
  ) : (
    <FileImage className="h-5 w-5 text-blue-500" />
  );

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 p-4">
      {/* Header */}
      <div className="text-center space-y-2 mb-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-blue-500" />
          SpeakUp
          <span className="text-muted-foreground font-light text-2xl">— AI Patient Advocate</span>
        </h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
          <AlertCircle className="h-4 w-4" />
          This is an AI analysis tool and does not constitute medical advice.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-muted/60 rounded-lg w-fit mx-auto">
        <button
          onClick={() => { setInputMode("text"); clearFile(); }}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === "text" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          ✍️ Type / Speak
        </button>
        <button
          onClick={() => setInputMode("file")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${inputMode === "file" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          📄 Upload Report
        </button>
      </div>

      {/* Input Card */}
      <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-background/80">
        <CardContent className="p-6 space-y-4">

          {/* ── TEXT / VOICE MODE ── */}
          {inputMode === "text" && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Describe your doctor's visit</h2>
                {recordingSupported && (
                  <div className="flex items-center gap-2">
                    {isRecording && (
                      <span className="flex items-center gap-1.5 text-red-500 text-sm font-medium animate-pulse">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block" />
                        Recording...
                      </span>
                    )}
                    {isTranscribing && !isRecording && (
                      <span className="text-muted-foreground text-sm flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                      </span>
                    )}
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={loading || isTranscribing}
                      className={`gap-1.5 ${isRecording ? "shadow-[0_0_0_3px_rgba(239,68,68,0.3)]" : ""}`}
                    >
                      {isRecording ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
                    </Button>
                  </div>
                )}
              </div>
              <Textarea
                placeholder={`"I told my doctor I had fatigue and hair loss for 3 months, but they told me to rest and didn't run any tests..."\n\nOr click 🎤 Speak to dictate.`}
                className="resize-none min-h-[140px] bg-background text-base"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading || isRecording}
              />
            </>
          )}

          {/* ── FILE UPLOAD MODE ── */}
          {inputMode === "file" && (
            <>
              <h2 className="text-lg font-semibold">Upload your medical report</h2>
              <p className="text-sm text-muted-foreground -mt-2">
                Supports <span className="font-medium">PDF documents</span> and <span className="font-medium">Screenshots</span> (JPG, PNG)
              </p>

              {!uploadedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all
                    ${isDragging
                      ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                      : "border-border hover:border-blue-400 hover:bg-muted/40"
                    }`}
                >
                  <UploadCloud className={`h-12 w-12 transition-colors ${isDragging ? "text-blue-500" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className="font-medium text-foreground">Drag & drop your PDF or image here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">PDF · JPG · PNG · WEBP</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* File pill */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                    {fileIcon}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {isExtracting ? (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Reading...
                      </div>
                    ) : (
                      <button onClick={clearFile} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Extracted text preview */}
                  {extractedPreview && !isExtracting && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Text extracted successfully
                      </p>
                      <Textarea
                        className="min-h-[120px] resize-y bg-background text-sm font-mono"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Extracted text will appear here..."
                      />
                      <p className="text-xs text-muted-foreground">You can edit the extracted text before analyzing.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={loading || !input.trim() || isRecording || isExtracting}
            className="w-full py-6 text-md bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your report...
              </span>
            ) : isExtracting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading file...
              </span>
            ) : (
              "Analyze & Generate Advocacy Tools"
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10 shadow-[0_4px_20px_-4px_rgba(34,197,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-md" />
            <CardHeader className="pb-3 border-b border-green-500/10">
              <CardTitle className="text-green-700 dark:text-green-500 flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-6 w-6" /> Validation Report
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-foreground/90 text-sm md:text-base [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:font-bold [&>h3]:text-lg">
              <ReactMarkdown>{results.validation}</ReactMarkdown>
            </CardContent>
          </Card>

          {results.timeline?.length > 0 && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="h-5 w-5" /> Symptom Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-6 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-max">
                  {results.timeline.map((item, i) => (
                    <div key={i} className="flex items-center">
                      <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20 whitespace-nowrap">
                        <span className="font-bold mr-2">{item.date}:</span>{item.event}
                      </div>
                      {i < results.timeline.length - 1 && <div className="w-8 h-0.5 bg-primary/20 mx-1 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-md" />
              <CardHeader className="pb-3 border-b border-amber-500/10 flex flex-row items-center justify-between">
                <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2 text-xl">
                  <HelpCircle className="h-6 w-6" /> Questions to Ask
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(results.questions, "q")} className="h-8 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
                  <Copy className="h-4 w-4 mr-1.5" />{isCopied["q"] ? "Copied!" : "Copy"}
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 text-foreground/90 text-sm md:text-base [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:font-bold [&>h3]:text-lg">
                <ReactMarkdown>{results.questions}</ReactMarkdown>
              </CardContent>
            </Card>

            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-md" />
              <CardHeader className="pb-3 border-b border-blue-500/10 flex flex-row items-center justify-between">
                <CardTitle className="text-blue-700 dark:text-blue-500 flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6" /> Follow-up Letter
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(results.letter, "l")} className="h-8 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">
                  <Copy className="h-4 w-4 mr-1.5" />{isCopied["l"] ? "Copied!" : "Copy"}
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 text-sm md:text-base">
                <Textarea
                  className="min-h-[280px] resize-y bg-background/50 text-foreground border-blue-500/20 font-mono text-xs md:text-sm"
                  defaultValue={results.letter}
                />
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
