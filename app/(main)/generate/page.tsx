"use client";

import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { Sparkles, Copy, CheckCircle2 } from "lucide-react";
import { saveSession } from "@/lib/storage";
import { GenerateSession } from "@/lib/types";

const SUBJECTS = [
  "Company Law", "Economic Laws", "Tax Laws", 
  "Company Accounts", "Capital Markets", "Industrial Laws"
];

const LOADING_MESSAGES = [
  "Analysing ICSI exam patterns...",
  "Structuring paper as per ICSI format...",
  "Writing questions from study material...",
  "Allocating marks per ICSI guidelines..."
];

export default function GeneratePage() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [scope, setScope] = useState("Full Paper (All Topics)");
  const [topic, setTopic] = useState("");
  const [types, setTypes] = useState({ descriptive: true, shortnotes: true, casestudy: true });
  const [marks, setMarks] = useState("100");
  const [difficulty, setDifficulty] = useState("Standard (ICSI Level)");
  
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [paper, setPaper] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaper("");
    setLoadingMsgIdx(0);

    const questionTypes = Object.entries(types)
      .filter(([_, checked]) => checked)
      .map(([key]) => key)
      .join(", ");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          scope: scope === "Specific Topic" ? "topic" : "full",
          topic: scope === "Specific Topic" ? topic : "",
          questionTypes: questionTypes.split(", "),
          marks: parseInt(marks),
          difficulty
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate");
      }
      
      const data = await res.json();
      setPaper(data.paper);

      const session: GenerateSession = {
        id: crypto.randomUUID(),
        type: "generate",
        date: new Date().toISOString(),
        subject: subject as any,
        scope: scope === "Specific Topic" ? "topic" : "full",
        topic: scope === "Specific Topic" ? topic : "Full Paper",
        marks: parseInt(marks) as any,
        difficulty: difficulty as any,
        questionTypes: questionTypes.split(", ") as any,
        paper: data.paper
      };
      
      await saveSession(session);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate paper. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paper);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12">
      <TopBar 
        title="Generate Question Paper" 
        subtitle="Create an ICSI standard paper tailored to your needs"
        breadcrumbs={[{ label: "Home" }, { label: "Generate Paper", href: "/generate" }]} 
      />

      <div className="p-8 max-w-4xl mx-auto space-y-8 reveal stagger-1">
        <form className="bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Subject</label>
              <select 
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Scope</label>
              <select 
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                value={scope}
                onChange={e => setScope(e.target.value)}
              >
                <option value="Full Paper (All Topics)">Full Paper (All Topics)</option>
                <option value="Specific Topic">Specific Topic</option>
              </select>
            </div>
          </div>

          {scope === "Specific Topic" && (
            <div className="space-y-2 reveal">
              <label className="text-sm font-semibold text-[#0f2640]">Topic Details</label>
              <input 
                type="text"
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                placeholder="e.g. Appointment of Directors, Share Capital, Winding Up..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-semibold text-[#0f2640]">Question Types</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-[#64748b] cursor-pointer hover:text-[#0f2640] transition-colors">
                <input 
                  type="checkbox" 
                  className="accent-[#e8590c] w-4 h-4"
                  checked={types.descriptive} 
                  onChange={e => setTypes({...types, descriptive: e.target.checked})} 
                />
                Descriptive / Long Answer (10–20 marks)
              </label>
              <label className="flex items-center gap-2 text-sm text-[#64748b] cursor-pointer hover:text-[#0f2640] transition-colors">
                <input 
                  type="checkbox" 
                  className="accent-[#e8590c] w-4 h-4"
                  checked={types.shortnotes} 
                  onChange={e => setTypes({...types, shortnotes: e.target.checked})} 
                />
                Short Notes (5–7 marks)
              </label>
              <label className="flex items-center gap-2 text-sm text-[#64748b] cursor-pointer hover:text-[#0f2640] transition-colors">
                <input 
                  type="checkbox" 
                  className="accent-[#e8590c] w-4 h-4"
                  checked={types.casestudy} 
                  onChange={e => setTypes({...types, casestudy: e.target.checked})} 
                />
                Case Study / Practical Based
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Total Marks</label>
              <select 
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                value={marks}
                onChange={e => setMarks(e.target.value)}
              >
                <option value="50">50 marks</option>
                <option value="70">70 marks</option>
                <option value="100">100 marks</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0f2640]">Difficulty</label>
              <select 
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a3a5c] bg-white transition-colors"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
              >
                <option value="Standard (ICSI Level)">Standard (ICSI Level)</option>
                <option value="Hard (Twisted Facts)">Hard (Twisted Facts)</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-[#e8590c] hover:bg-[#c94d0a] disabled:bg-[#94a3b8] text-white px-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Generating...
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Generate Question Paper
              </>
            )}
          </button>

          {loading && (
            <div className="space-y-3 pt-4 reveal">
              <div className="bg-[#e2e8f0] rounded-full h-2 overflow-hidden">
                <div className="bg-[#1a3a5c] w-full h-full rounded-full origin-left animate-pulse" />
              </div>
              <p className="text-sm text-center text-[#1a3a5c] font-medium animate-pulse">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            </div>
          )}
        </form>

        {paper && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-lg reveal stagger-2">
            <div className="flex justify-between items-center mb-6 border-b border-[#e2e8f0] pb-4">
              <h2 className="text-xl font-bold font-playfair text-[#0f2640]">Generated Question Paper</h2>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 border border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Paper"}
              </button>
            </div>
            
            <div className="font-serif text-[#0f2640] whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {paper}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
