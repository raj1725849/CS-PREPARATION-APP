"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { getEvaluateSessions, getGenerateSessions, computeDashboardStats } from "@/lib/storage";
import { Session, EvaluateSession, GeneratedPaperDocument } from "@/lib/types";
import { TrendingUp, AlertCircle, FileText, CheckSquare, Target, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import UpgradeModal from "@/components/UpgradeModal";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Dashboard() {
  const { plan } = useAuth();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [evalSessions, setEvalSessions] = useState<EvaluateSession[]>([]);
  const [genSessions, setGenSessions] = useState<any[]>([]);
  const [mockPapers, setMockPapers] = useState<GeneratedPaperDocument[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loadingPapers, setLoadingPapers] = useState(false);

  useEffect(() => {
    setIsClient(true);
    async function loadData() {
      const evals = await getEvaluateSessions();
      const gens = await getGenerateSessions();
      const st = await computeDashboardStats();
      setEvalSessions(evals);
      setGenSessions(gens);
      setStats(st);
      
      // Fetch mock papers from Firestore
      const currentUser = auth.currentUser;
      if (currentUser) {
        setLoadingPapers(true);
        try {
          const q = query(
            collection(db, "generated_papers"),
            where("userId", "==", currentUser.uid)
          );
          const snap = await getDocs(q);
          const papersList = snap.docs.map((doc) => doc.data() as GeneratedPaperDocument);
          // Sort by createdAt descending
          papersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMockPapers(papersList);
        } catch (err) {
          console.error("Failed to fetch mock papers on dashboard:", err);
        } finally {
          setLoadingPapers(false);
        }
      }
    }
    loadData();
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-12 bg-[#1B1E4A]">
        <div className="w-8 h-8 border-4 border-[#D21319] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (plan === "free") {
    return (
      <div className="min-h-screen pb-12 flex flex-col bg-[#1B1E4A]">
        <TopBar 
          title="My Dashboard" 
          subtitle="Track your progress and identify weak areas" 
          breadcrumbs={[{ label: "Home" }, { label: "Dashboard", href: "/dashboard" }]} 
        />
        <div className="flex-grow flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-[#222659] border border-[#AFAEA2]/20 rounded-2xl p-8 md:p-10 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#D21319]/15 border border-[#D21319]/35 rounded-full flex items-center justify-center text-[#D21319] mx-auto">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-sora tracking-tight">
                Premium Access Required
              </h2>
              <p className="text-sm text-[#AFAEA2] max-w-md mx-auto leading-relaxed font-inter">
                Performance analytics, progress tracking, average scores, and weak-topic analysis are exclusive premium features. 
              </p>
            </div>
            <div className="bg-[#141639] border border-[#AFAEA2]/15 rounded-xl p-5 text-left max-w-md mx-auto">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-sora">
                What you unlock with Premium:
              </h4>
              <ul className="space-y-2 text-xs text-[#AFAEA2] font-inter">
                <li className="flex items-center gap-2">✓ Unlimited AI Question Papers</li>
                <li className="flex items-center gap-2">✓ Unlimited Answer Sheet Evaluations</li>
                <li className="flex items-center gap-2">✓ Detailed performance progress charts</li>
                <li className="flex items-center gap-2">✓ Automated mistake pattern recognition</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setIsUpgradeOpen(true)}
                className="w-full sm:w-auto bg-[#D21319] hover:bg-[#b81015] text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 whitespace-nowrap font-inter cursor-pointer"
              >
                Upgrade to Premium
              </button>
              <Link
                href="/generate"
                className="w-full sm:w-auto border border-[#AFAEA2]/30 text-white hover:border-[#AFAEA2] hover:bg-white/[0.04] px-8 py-3 rounded-xl font-semibold text-sm transition-colors text-center font-inter"
              >
                Try Free Practice
              </Link>
            </div>
          </div>
        </div>
        <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-12 bg-[#1B1E4A]">
        <div className="w-8 h-8 border-4 border-[#D21319] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const subjectProgress: { subject: string, avg: number }[] = stats.subjectPerformance.map((p: any) => ({
    subject: p.subject,
    avg: p.avgScore
  }));

  const mistakes: { desc: string, count: number }[] = stats.mistakePatterns.map((m: any) => ({
    desc: m.description,
    count: m.frequency
  }));

  return (
    <div className="min-h-screen pb-12 bg-[#1B1E4A]">
      <TopBar 
        title="My Dashboard" 
        subtitle="Track your progress and identify weak areas" 
        breadcrumbs={[{ label: "Home" }, { label: "Dashboard", href: "/dashboard" }]} 
      />

      <div className="p-8 space-y-8 reveal stagger-1">
        
        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Total Papers Generated" value={stats.totalPapersGenerated.toString()} />
          <StatCard 
            title="Average Score" 
            value={`${stats.avgScorePercent.toFixed(1)}%`} 
            valueClass={stats.avgScorePercent >= 70 ? "text-green-400" : stats.avgScorePercent >= 50 ? "text-amber-400" : "text-[#D21319]"}
          />
          <StatCard title="Total Evaluations" value={stats.totalEvaluations.toString()} />
          <StatCard 
            title="Weakest Subject" 
            value={stats.weakestSubject ? stats.weakestSubject : "-"} 
            valueClass="text-[#D21319]"
          />
        </div>

        {/* TWO COLUMN ROW: Progress & Mistakes */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 reveal stagger-2">
          <div className="md:col-span-7 bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Subject Progress</h3>
            <div className="space-y-4">
              {subjectProgress.length === 0 ? <p className="text-sm text-[#AFAEA2] font-inter">No evaluations yet.</p> : null}
              {subjectProgress.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm font-medium text-white font-inter">
                    <span>{item.subject}</span>
                    <span className={item.avg >= 70 ? "text-green-400" : item.avg >= 50 ? "text-amber-400" : "text-[#D21319]"}>{item.avg.toFixed(0)}%</span>
                  </div>
                  <div className="bg-[#141639] rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#D21319] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Common Mistakes</h3>
            {mistakes.length === 0 ? (
              <p className="text-sm text-[#AFAEA2] font-inter">No mistakes recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {mistakes.map((m, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-2 text-sm text-white font-inter">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D21319] mt-1 shrink-0" />
                      <span className="line-clamp-1">{m.desc}</span>
                    </span>
                    <span className="bg-[#D21319]/15 text-[#D21319] px-2 py-0.5 rounded-full text-xs font-bold shrink-0 font-sora border border-[#D21319]/25">{m.count}</span>
                  </li>
                ))}
              </ul>
            )}
            {mistakes.length > 0 && (
              <div className="mt-6 p-4 bg-[#141639] border border-[#AFAEA2]/20 rounded-lg">
                <p className="text-sm text-[#AFAEA2] flex items-start gap-2 font-inter">
                  <AlertCircle className="w-4 h-4 text-[#D21319] shrink-0 mt-0.5" />
                  <span><strong>Tip:</strong> Most of your deductions come from {mistakes[0].desc}. Try to focus on this area.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MOCK EXAMS SIMULATION HUB */}
        <div className="bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm reveal stagger-3">
          <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Mock Exam Simulations</h3>
          {loadingPapers ? (
            <div className="py-8 text-center flex items-center justify-center gap-2 text-[#AFAEA2] text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#D21319]" /> Loading mock exams...
            </div>
          ) : mockPapers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#AFAEA2] font-inter">
              No mock exams simulated yet. Go to <Link href="/generate" className="text-[#D21319] underline font-semibold">Generate Paper</Link> to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#AFAEA2] border-b border-[#AFAEA2]/20 font-inter">
                  <tr>
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 font-medium">Subject</th>
                    <th className="py-3 font-medium">Marks</th>
                    <th className="py-3 font-medium">Status</th>
                    <th className="py-3 font-medium">Score / Verdict</th>
                    <th className="py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AFAEA2]/10 font-inter">
                  {mockPapers.map((paper, idx) => (
                    <tr key={idx} className="text-white hover:bg-white/[0.02]">
                      <td className="py-3">{new Date(paper.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 font-medium">{paper.subject}</td>
                      <td className="py-3">{paper.totalMarks}m</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          paper.status === 'completed' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : paper.status === 'attempted'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : paper.status === 'evaluating'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {paper.status}
                        </span>
                      </td>
                      <td className="py-3 font-medium">
                        {paper.status === 'completed' && paper.evaluationSummary ? (
                          <span className={paper.evaluationSummary.verdict === 'Pass' ? "text-green-400" : paper.evaluationSummary.verdict === 'Borderline Pass' ? "text-amber-400" : "text-[#D21319]"}>
                            {paper.evaluationSummary.marksAwarded} / {paper.totalMarks} ({paper.evaluationSummary.verdict})
                          </span>
                        ) : (
                          <span className="text-[#AFAEA2]">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Link href={`/papers/${paper.paperId}`} className="text-[#D21319] hover:underline font-semibold text-xs">
                          {paper.status === 'completed' ? 'Review Report' : paper.status === 'generated' ? 'Attempt Exam' : 'Verify OCR'} &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* HISTORY TABLE */}
        <div className="bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm reveal stagger-4">
          <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Single Question Practice History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#AFAEA2] border-b border-[#AFAEA2]/20 font-inter">
                <tr>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Subject</th>
                  <th className="py-3 font-medium">Score</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#AFAEA2]/10 font-inter">
                {[...genSessions, ...evalSessions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((session, i) => (
                  <tr key={i} className="text-white hover:bg-white/[0.02]">
                    <td className="py-3">{new Date(session.date).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${session.type === 'generate' ? 'bg-[#D21319]/15 text-[#D21319] border border-[#D21319]/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {session.type === 'generate' ? 'Generate' : 'Evaluate'}
                      </span>
                    </td>
                    <td className="py-3">{session.subject}</td>
                    <td className="py-3 font-medium">
                      {session.type === 'evaluate' ? (
                        <span className={((session.marks_awarded / session.total_marks) * 100) >= 70 ? "text-green-400" : ((session.marks_awarded / session.total_marks) * 100) >= 50 ? "text-amber-400" : "text-[#D21319]"}>
                          {session.marks_awarded} / {session.total_marks}
                        </span>
                      ) : (
                        <span className="text-[#AFAEA2]">Paper Only</span>
                      )}
                    </td>
                    <td className="py-3">
                      {session.type === 'evaluate' ? (
                        <Link href={`/evaluate?sessionId=${session.id}`} className="text-[#D21319] hover:underline font-semibold transition-colors">
                          View Feedback
                        </Link>
                      ) : (
                        <button className="text-[#D21319] hover:underline font-semibold transition-colors cursor-pointer">Regenerate</button>
                      )}
                    </td>
                  </tr>
                ))}
                {genSessions.length === 0 && evalSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#AFAEA2]">No activity yet. Generate a paper to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TWO COLUMN ROW: Chart & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal stagger-5">
          
          <div className="bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Score Trend</h3>
            {evalSessions.length < 3 ? (
              <div className="h-[200px] flex items-center justify-center border border-dashed border-[#AFAEA2]/20 rounded-lg">
                <p className="text-sm text-[#AFAEA2] font-inter">Complete more evaluations to see trend</p>
              </div>
            ) : (
              <div className="h-[200px] relative w-full overflow-hidden flex items-end">
                {/* SVG Chart */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D21319" stopOpacity="0.35"/>
                      <stop offset="100%" stopColor="#D21319" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  <path d="M 0 50 L 100 50" stroke="rgba(175,174,162,0.15)" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
                  <path 
                    d={`M 0 100 ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `L ${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' ')} L 100 100 Z`} 
                    fill="url(#chartGradient)" 
                  />
                  <path 
                    d={`M ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' L ')}`} 
                    stroke="#D21319" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" 
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#AFAEA2] uppercase tracking-wider mb-4 font-sora">Recommended Next Steps</h3>
            <div className="space-y-4">
              <div className="bg-[#141639] p-4 rounded-xl border border-[#D21319]/35 hover:border-[#D21319]/60 transition-all">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-[#D21319]/10 text-[#D21319] shrink-0 h-fit">
                    <Target className="w-5 h-5 text-[#D21319]" />
                  </div>
                  <div className="font-inter">
                    <h4 className="text-sm font-bold text-white font-sora">Focus on {stats.weakestSubject !== "None" ? stats.weakestSubject : "a subject"}</h4>
                    <p className="text-xs text-[#AFAEA2] mt-1 mb-2">This is currently your weakest area.</p>
                    <Link href={`/generate`} className="text-xs font-bold text-[#D21319] hover:underline transition-all">
                      Generate Practice Paper &rarr;
                    </Link>
                  </div>
                </div>
              </div>
              <div className="bg-[#141639] p-4 rounded-xl border border-[#AFAEA2]/20 hover:border-[#AFAEA2]/40 transition-all">
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-white/[0.05] text-[#AFAEA2] shrink-0 h-fit">
                    <FileText className="w-5 h-5 text-[#AFAEA2]" />
                  </div>
                  <div className="font-inter">
                    <h4 className="text-sm font-bold text-white font-sora">Review Common Mistakes</h4>
                    <p className="text-xs text-[#AFAEA2] mt-1 mb-2">You frequently miss specific legal provisions.</p>
                    <Link href={`/evaluate`} className="text-xs font-bold text-[#D21319] hover:underline transition-all">
                      Practice Writing Answers &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </div>
  );
}

function StatCard({ title, value, valueClass = "text-white" }: { title: string, value: string, valueClass?: string }) {
  return (
    <div className="bg-[#222659] rounded-xl border border-[#AFAEA2]/20 p-6 shadow-sm hover:border-[#AFAEA2]/40 transition-all">
      <h3 className="text-xs font-semibold text-[#AFAEA2] uppercase tracking-wider mb-2 font-inter">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-extrabold font-sora ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}
