"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, FileText, HelpCircle, Activity, Copy, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

export default function AdvocateApp() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState<{ [key: string]: boolean }>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied({ ...isCopied, [id]: true });
    setTimeout(() => setIsCopied({ ...isCopied, [id]: false }), 2000);
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze input.");
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full max-w-4xl mx-auto flex flex-col gap-6 relative z-10 p-4">
      {/* Header */}
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-blue-500" />
          SpeakUp <span className="text-muted-foreground font-light text-2xl">— AI Patient Advocate</span>
        </h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1">
          <AlertCircle className="h-4 w-4" /> This is an AI analysis tool and does not constitute medical advice.
        </p>
      </div>

      {/* Input Section */}
      <Card className="border-border/50 shadow-lg shadow-black/5 dark:shadow-white/5 backdrop-blur-sm bg-background/80">
        <CardContent className="p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Describe your recent doctor's visit</h2>
            <Textarea
              placeholder="Example: I told my doctor I had extreme fatigue and hair loss for 3 months, but they just told me to sleep more and sent me home without any blood tests..."
              className="resize-none min-h-[120px] bg-background text-base"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !input.trim()} 
              className="w-full text-md py-6 bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
            >
              {loading ? "Analyzing your visit..." : "Analyze Visit & Generate Tools"}
            </Button>
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 mt-2 flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
          
          {/* Validation Report */}
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10 shadow-[0_4px_20px_-4px_rgba(34,197,94,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-l-md" />
            <CardHeader className="pb-3 border-b border-green-500/10">
              <CardTitle className="text-green-700 dark:text-green-500 flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-6 w-6" /> Validation Report
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-foreground/90 max-w-none text-sm md:text-base [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:font-bold [&>h3]:text-lg">
              <ReactMarkdown>{results.validation}</ReactMarkdown>
            </CardContent>
          </Card>

          {/* Timeline (Optional) */}
          {results.timeline && results.timeline.length > 0 && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2 text-xl">
                  <Clock className="h-5 w-5" /> Symptom Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  {results.timeline.map((item, index) => (
                    <div key={index} className="flex items-center">
                      <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium border border-primary/20">
                        <span className="font-bold mr-2">{item.date}:</span>
                        {item.event}
                      </div>
                      {index < results.timeline.length - 1 && (
                        <div className="w-8 h-0.5 bg-primary/20 mx-1" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Questions to Ask */}
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-md" />
              <CardHeader className="pb-3 border-b border-amber-500/10 flex flex-row items-center justify-between">
                <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2 text-xl">
                  <HelpCircle className="h-6 w-6" /> Questions to Ask
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(results.questions, 'questions')} className="h-8 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
                  <Copy className="h-4 w-4 mr-1.5" />
                  {isCopied['questions'] ? 'Copied!' : 'Copy'}
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 text-foreground/90 max-w-none text-sm md:text-base [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>h3]:font-bold [&>h3]:text-lg">
                <ReactMarkdown>{results.questions}</ReactMarkdown>
              </CardContent>
            </Card>

            {/* Follow-up Letter */}
            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.15)] relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-md" />
              <CardHeader className="pb-3 border-b border-blue-500/10 flex flex-row items-center justify-between">
                <CardTitle className="text-blue-700 dark:text-blue-500 flex items-center gap-2 text-xl">
                  <FileText className="h-6 w-6" /> Follow-up Letter
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(results.letter, 'letter')} className="h-8 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">
                  <Copy className="h-4 w-4 mr-1.5" />
                  {isCopied['letter'] ? 'Copied!' : 'Copy'}
                </Button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 text-foreground/90 max-w-none text-sm md:text-base">
                <Textarea 
                  className="min-h-[250px] resize-y bg-background/50 text-foreground border-blue-500/20 font-mono text-xs md:text-sm"
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
