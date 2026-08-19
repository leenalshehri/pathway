"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export default function GoalSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"initial" | "clarifying" | "generating" | "done">("initial");
  const [goalInput, setGoalInput] = useState("");
  const [constraints, setConstraints] = useState("1 hour per day");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [clarifiedObjective, setClarifiedObjective] = useState("");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const handleInitialSubmit = async () => {
    if (!goalInput) return;
    setStep("clarifying");
    setErrorMsg(null);
    
    try {
      const res = await fetch("/api/goal/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalInput, constraints, previousAnswers: [] }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        setErrorMsg(res.status === 429 ? errorText : `API Error: ${errorText}`);
        setStep("initial");
        return;
      }
      const data = await res.json();
      
      setFeedback(data.feedback);
      
      if (data.is_clear) {
        setClarifiedObjective(data.clarified_goal);
        await handleGenerate(data.clarified_goal);
      } else {
        setQuestions(data.questions || []);
        setAnswers(new Array(data.questions?.length || 0).fill(""));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect to the server.");
      setStep("initial");
    }
  };

  const handleAnswersSubmit = async () => {
    setStep("clarifying");
    setErrorMsg(null);
    const previousAnswers = questions.map((q, i) => ({ question: q, answer: answers[i] }));
    
    try {
      const res = await fetch("/api/goal/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalInput, constraints, previousAnswers }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        setErrorMsg(res.status === 429 ? errorText : `API Error: ${errorText}`);
        return; // Don't change step, let them retry
      }
      const data = await res.json();
      
      setFeedback(data.feedback);
      
      if (data.is_clear) {
        setClarifiedObjective(data.clarified_goal);
        await handleGenerate(data.clarified_goal);
      } else {
        setQuestions(data.questions || []);
        setAnswers(new Array(data.questions?.length || 0).fill(""));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to connect to the server.");
    }
  };

  const handleGenerate = async (objective: string) => {
    setStep("generating");
    setErrorMsg(null);
    
    try {
      // 1. Create the base goal first to get an ID
      const createRes = await fetch("/api/goal/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalInput: goalInput, constraints, clarifiedObjective: objective }),
      });
      if (!createRes.ok) {
        const errorText = await createRes.text();
        setErrorMsg(createRes.status === 429 ? errorText : "Failed to create goal");
        setStep("initial");
        return;
      }
      const { id } = await createRes.json();
      setGoalId(id);

      // 2. Generate Roadmap
      const genRes = await fetch("/api/goal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: id, clarifiedObjective: objective, constraints }),
      });
      if (!genRes.ok) {
        const errorText = await genRes.text();
        setErrorMsg(genRes.status === 429 ? errorText : "Failed to generate roadmap");
        setStep("initial");
        return;
      }
      
      setStep("done");
      setTimeout(() => {
        router.push(`/roadmap/${id}`);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to generate plan.");
      setStep("initial");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 font-sans transition-colors relative">
      <button 
        onClick={() => router.back()} 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="w-full max-w-xl z-10">
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm animate-in fade-in">
            {errorMsg}
          </div>
        )}
        
        {step === "initial" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Sparkles className="text-blue-500" size={24} /> What is your goal?
              </h1>
              <p className="text-muted-foreground text-lg font-light">Be as vague or specific as you like. We'll figure it out together.</p>
            </div>
            
            <div className="space-y-4">
              <textarea 
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                placeholder="e.g. I want to learn Spanish..."
                className="w-full bg-card border border-card-border rounded-2xl p-5 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none h-32 placeholder:text-muted-foreground shadow-sm"
              />
              
              <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground ml-1">Any constraints? (Time, budget, deadline)</label>
                 <input 
                  type="text"
                  value={constraints}
                  onChange={e => setConstraints(e.target.value)}
                  placeholder="e.g. 1 hour a day, beginner level"
                  className="w-full bg-card border border-card-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                 />
              </div>
              
              <button 
                onClick={handleInitialSubmit}
                disabled={!goalInput}
                className="w-full bg-foreground text-background font-medium rounded-xl py-4 flex items-center justify-center gap-2 hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                Analyze Goal <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === "clarifying" && questions.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-3 bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <Sparkles className="text-blue-500 mt-1 shrink-0" size={20} />
                <p className="text-foreground leading-relaxed font-medium">{feedback}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={idx} className="space-y-3">
                  <label className="text-foreground font-medium">{q}</label>
                  <input 
                    type="text"
                    value={answers[idx]}
                    onChange={e => {
                      const newAns = [...answers];
                      newAns[idx] = e.target.value;
                      setAnswers(newAns);
                    }}
                    className="w-full bg-card border border-card-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                  />
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleAnswersSubmit}
              className="w-full bg-foreground text-background font-medium rounded-xl py-4 flex items-center justify-center gap-2 hover:opacity-90 transition-colors shadow-md"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {(step === "clarifying" && questions.length === 0) || step === "generating" ? (
          <div className="flex flex-col items-center justify-center space-y-6 h-64 animate-in fade-in duration-1000 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
              <Loader2 className="animate-spin text-blue-500 relative" size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Synthesizing your roadmap...</h2>
              <p className="text-muted-foreground font-medium">Structuring phases, milestones, and daily tasks.</p>
            </div>
          </div>
        ) : null}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center space-y-6 h-64 animate-in fade-in zoom-in-95 duration-500 text-center">
            <CheckCircle2 className="text-green-500" size={64} />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Roadmap Ready</h2>
              <p className="text-muted-foreground font-medium">Taking you to your new plan...</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
