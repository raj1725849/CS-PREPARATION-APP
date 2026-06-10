"use client";

import { useEffect, useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { getEvaluateSessions, getGenerateSessions, computeDashboardStats } from "@/lib/storage";
import { Session, EvaluateSession, Deduction } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, FileText, CheckSquare, Target } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [evalSessions, setEvalSessions] = useState<EvaluateSession[]>([]);
  const [genSessions, setGenSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    async function loadData() {
      const evals = await getEvaluateSessions();
      const gens = await getGenerateSessions();
      const st = await computeDashboardStats();
      setEvalSessions(evals);
      setGenSessions(gens);
      setStats(st);
    }
    loadData();
  }, []);

  if (!isClient || !stats) return null; // Avoid hydration mismatch

  const subjectProgress: { subject: string, avg: number }[] = stats.subjectPerformance.map((p: any) => ({
    subject: p.subject,
    avg: p.avgScore
  }));

  const mistakes: { desc: string, count: number }[] = stats.mistakePatterns.map((m: any) => ({
    desc: m.description,
    count: m.frequency
  }));

  return (
    <div className="min-h-screen pb-12">
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
            valueClass={stats.avgScorePercent >= 70 ? "text-green-600" : stats.avgScorePercent >= 50 ? "text-orange-600" : "text-red-600"}
          />
          <StatCard title="Total Evaluations" value={stats.totalEvaluations.toString()} />
          <StatCard 
            title="Weakest Subject" 
            value={stats.weakestSubject ? stats.weakestSubject : "-"} 
            valueClass="text-red-600 text-lg"
          />
        </div>

        {/* TWO COLUMN ROW: Progress & Mistakes */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 reveal stagger-2">
          <div className="md:col-span-7 bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Subject Progress</h3>
            <div className="space-y-4">
              {subjectProgress.length === 0 ? <p className="text-sm text-[#64748b]">No evaluations yet.</p> : null}
              {subjectProgress.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm font-medium text-[#0f2640]">
                    <span>{item.subject}</span>
                    <span className={item.avg >= 70 ? "text-green-600" : item.avg >= 50 ? "text-orange-600" : "text-red-600"}>{item.avg.toFixed(0)}%</span>
                  </div>
                  <div className="bg-[#e2e8f0] rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#1a3a5c] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-5 bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Common Mistakes</h3>
            {mistakes.length === 0 ? (
              <p className="text-sm text-[#64748b]">No mistakes recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {mistakes.map((m, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-2 text-sm text-[#0f2640]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e8590c] mt-1 shrink-0" />
                      <span className="line-clamp-1">{m.desc}</span>
                    </span>
                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium shrink-0">{m.count}</span>
                  </li>
                ))}
              </ul>
            )}
            {mistakes.length > 0 && (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-[#0f2640] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#e8590c] shrink-0 mt-0.5" />
                  <span><strong>Tip:</strong> Most of your deductions come from {mistakes[0].desc}. Try to focus on this area.</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* HISTORY TABLE */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm reveal stagger-3">
          <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Recent History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#64748b] border-b border-[#e2e8f0]">
                <tr>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Subject</th>
                  <th className="py-3 font-medium">Score</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {[...genSessions, ...evalSessions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((session, i) => (
                  <tr key={i} className="text-[#0f2640]">
                    <td className="py-3">{new Date(session.date).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.type === 'generate' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {session.type === 'generate' ? 'Generate' : 'Evaluate'}
                      </span>
                    </td>
                    <td className="py-3">{session.subject}</td>
                    <td className="py-3 font-medium">
                      {session.type === 'evaluate' ? (
                        <span className={((session.marks_awarded / session.total_marks) * 100) >= 70 ? "text-green-600" : ((session.marks_awarded / session.total_marks) * 100) >= 50 ? "text-orange-600" : "text-red-600"}>
                          {session.marks_awarded} / {session.total_marks}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">Paper Only</span>
                      )}
                    </td>
                    <td className="py-3">
                      {session.type === 'evaluate' ? (
                        <button className="text-[#1a3a5c] hover:text-[#e8590c] font-medium transition-colors">View Feedback</button>
                      ) : (
                        <button className="text-[#1a3a5c] hover:text-[#e8590c] font-medium transition-colors">Regenerate</button>
                      )}
                    </td>
                  </tr>
                ))}
                {genSessions.length === 0 && evalSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#64748b]">No activity yet. Generate a paper to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TWO COLUMN ROW: Chart & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal stagger-4">
          
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Score Trend</h3>
            {evalSessions.length < 3 ? (
              <div className="h-[200px] flex items-center justify-center border border-dashed border-[#e2e8f0] rounded-lg">
                <p className="text-sm text-[#94a3b8]">Complete more evaluations to see trend</p>
              </div>
            ) : (
              <div className="h-[200px] relative w-full overflow-hidden flex items-end">
                {/* SVG Chart */}
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
                  <path d="M 0 50 L 100 50" stroke="#e8590c" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
                  <path 
                    d={`M 0 100 ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `L ${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' ')} L 100 100 Z`} 
                    fill="#1a3a5c" fillOpacity="0.1" 
                  />
                  <path 
                    d={`M ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' L ')}`} 
                    stroke="#1a3a5c" strokeWidth="2" fill="none" 
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
            <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-4">Recommended Next Steps</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-[#dc2626] bg-[#f8f9fa] p-4 rounded-r-lg">
                <div className="flex gap-3">
                  <Target className="w-5 h-5 text-[#dc2626] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#0f2640]">Focus on {stats.weakestSubject !== "None" ? stats.weakestSubject : "a subject"}</h4>
                    <p className="text-xs text-[#64748b] mt-1 mb-2">This is currently your weakest area.</p>
                    <Link href={`/generate`} className="text-xs font-semibold text-[#1a3a5c] hover:text-[#e8590c] transition-colors">
                      Generate Practice Paper &rarr;
                    </Link>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-[#e8590c] bg-[#f8f9fa] p-4 rounded-r-lg">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-[#e8590c] shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#0f2640]">Review Common Mistakes</h4>
                    <p className="text-xs text-[#64748b] mt-1 mb-2">You frequently miss specific legal provisions.</p>
                    <Link href={`/evaluate`} className="text-xs font-semibold text-[#1a3a5c] hover:text-[#e8590c] transition-colors">
                      Practice Writing Answers &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, valueClass = "text-[#0f2640]" }: { title: string, value: string, valueClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold font-playfair ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}
