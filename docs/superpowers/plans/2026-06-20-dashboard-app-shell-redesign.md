# Dashboard & App Shell Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the authenticated student dashboard and app shell (Sidebar, TopBar, UpgradeModal) to match the new Forest Green & Lime branding, featuring editorial typography and premium dark digital console styles.

**Architecture:** Update backgrounds, borders, text colors, active states, progress indicators, and custom SVG line charts to use the forest green base (`#0A231C`), sidebar alt (`#061814`), card base (`#0e352a`), and glowing lime (`#E8F29E`) palette. Align layout typography with Sora and Playfair Display fonts.

**Tech Stack:** Next.js, Tailwind CSS v4, Framer Motion, Lucide React, Razorpay Checkout

---

### Task 1: Sidebar Theme Upgrade

**Files:**
- Modify: `components/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar container backgrounds, fonts, and active states**
  Update the main wrapper in [Sidebar.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/Sidebar.tsx) to use `#061814` background. Change the active navigation styles from orange (`#e8590c`) to glowing lime (`#E8F29E`). Change navigation item active background to `bg-white/[0.03]`.
  
  Replace the rendering of nav items (around line 49-62) with:
  ```typescript
  return (
    <Link
      key={item.name}
      href={item.href}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${
        isActive
          ? "bg-white/[0.03] text-[#E8F29E] border-l-4 border-[#E8F29E]"
          : "text-[#a8bcb5] hover:bg-white/[0.02] hover:text-white border-l-4 border-transparent"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium font-inter">{item.name}</span>
    </Link>
  );
  ```

- [ ] **Step 2: Update Sidebar brand logo, menu label, and plan indicators**
  Change the sidebar base wrapper class to:
  ```typescript
  <div className="fixed left-0 top-0 w-[240px] h-full bg-[#061814] flex flex-col z-50 border-r border-[rgba(232,242,158,0.05)]">
  ```
  Ensure the text values for labels use `#a8bcb5` (Sage Green) or white. Modify the upgrade button styling (around line 78-86):
  ```typescript
  {plan === "free" && (
    <button
      onClick={() => setIsUpgradeOpen(true)}
      className="bg-[#E8F29E] hover:bg-[#d9e28f] text-[#0A231C] text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
    >
      Upgrade
    </button>
  )}
  ```
  And update the plan details box background:
  ```typescript
  <div className="mb-4 p-3 bg-[#0e352a]/40 rounded-lg border border-[rgba(232,242,158,0.08)]">
  ```

- [ ] **Step 3: Verify and compile**
  Run: `npx tsc --noEmit`
  Expected: Success. Check the sidebar visual transition in the browser.

- [ ] **Step 4: Commit**
  ```bash
  git add components/Sidebar.tsx
  git commit -m "style: redesign Sidebar components with Forest Green & Lime styling"
  ```

---

### Task 2: TopBar Glassmorphic Redesign & Main Layout Background

**Files:**
- Modify: `components/TopBar.tsx`
- Modify: `app/(main)/layout.tsx`

- [ ] **Step 1: Redesign TopBar to translucent dark glassmorphic header**
  Modify [TopBar.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/TopBar.tsx) to use dark forest green translucent backgrounds with glowing border splitters. Change titles to white and playfair/sora typography.
  
  Replace the parent return statement with:
  ```typescript
  return (
    <div className="bg-[#0A231C]/80 backdrop-blur-md border-b border-[rgba(232,242,158,0.08)] px-8 py-6 sticky top-0 z-40">
      <div className="flex flex-col gap-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-[#a8bcb5] mb-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={crumb.label} className="flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-white" : ""}>{crumb.label}</span>
                )}
                {!isLast && <ChevronRight className="w-3 h-3 text-[#a8bcb5]/50" />}
              </div>
            );
          })}
        </nav>

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-white font-sora tracking-tight">
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-[#a8bcb5] mt-1 font-inter">{subtitle}</p>
        )}
      </div>
    </div>
  );
  ```

- [ ] **Step 2: Add brand background to main shell layout**
  Modify [layout.tsx](file:///c:/Users/LENOVO/CS%20PREP/app/%28main%29/layout.tsx) to ensure the parent body container uses the `#0A231C` background and has no white background leakage.
  
  Update `MainLayout` return:
  ```typescript
  return (
    <div className="flex min-h-screen w-full bg-[#0A231C]">
      <Sidebar />
      <main className="flex-1 ml-[240px] bg-[#0A231C]">
        {children}
      </main>
    </div>
  );
  ```

- [ ] **Step 3: Verification**
  Run: `npx tsc --noEmit`
  Expected: Compile successfully. Check visual shell layout in browser.

- [ ] **Step 4: Commit**
  ```bash
  git add components/TopBar.tsx app/\(main\)/layout.tsx
  git commit -m "style: apply glassmorphism to TopBar and update main container background"
  ```

---

### Task 3: Upgrade Modal Redesign

**Files:**
- Modify: `components/UpgradeModal.tsx`

- [ ] **Step 1: Set modal backdrop, box wrapper, and color theme**
  Modify [UpgradeModal.tsx](file:///c:/Users/LENOVO/CS%20PREP/components/UpgradeModal.tsx). Update the modal container and card wrappers to `#0A231C`, `#0e352a`, and change Razorpay checkout color theme config to `#E8F29E`.
  
  Update Razorpay options theme color:
  ```typescript
  theme: {
    color: "#E8F29E"
  }
  ```
  
  Update outer modal wrappers and header text styling:
  ```typescript
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#0A231C] border border-[rgba(232,242,158,0.15)] rounded-2xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#a8bcb5] hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#E8F29E]/20 border border-[#E8F29E]/50 rounded-full flex items-center justify-center text-[#E8F29E]">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white font-sora tracking-tight">Upgrade Successful!</h2>
            <p className="text-[#a8bcb5] max-w-xs font-inter">
              Welcome to your new plan. Premium access has been successfully unlocked.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white font-sora tracking-tight">
                Upgrade to Premium
              </h2>
              <p className="text-[#a8bcb5] mt-2 font-inter">
                Accelerate your CS Exam preparation with custom AI mock tests and real-time detailed evaluations.
              </p>
            </div>
  ```

- [ ] **Step 2: Upgrade pricing card highlights, details, and buttons**
  Apply Forest Green & Lime skin to plan card items. Update checks to lime and update buttons to use glowing lime.
  
  Replace the pricing card layout (around line 211-273) with:
  ```typescript
  <div className="grid md:grid-cols-3 gap-6">
    {plans.map((p) => {
      const isActivePlan = plan === p.id;

      return (
        <div
          key={p.id}
          className={`flex flex-col rounded-xl p-5 md:p-6 border transition-all relative ${
            p.popular
              ? "border-[#E8F29E] bg-[#0e352a] shadow-lg shadow-[#E8F29E]/5"
              : "border-[rgba(232,242,158,0.08)] bg-[#0e352a]/40"
          }`}
        >
          {p.popular && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8F29E] text-[#0A231C] text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full font-sora">
              Most Popular
            </span>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-bold text-white font-sora">{p.name}</h3>
            {p.savings && !p.popular && (
              <span className="inline-block bg-[#E8F29E]/10 border border-[#E8F29E]/20 text-[#E8F29E] text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 font-sora">
                {p.savings}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1 mb-5">
            <span className="text-3xl md:text-4xl font-extrabold text-white font-sora">{p.price}</span>
            <span className="text-[#a8bcb5] text-xs font-inter">/ {p.period}</span>
          </div>

          <ul className="space-y-3 mb-6 flex-1 text-left">
            {p.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-[#a8bcb5] font-inter">
                <Check className="w-4 h-4 text-[#E8F29E] flex-shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleUpgrade(p.id)}
            disabled={loadingPlan !== null || isActivePlan}
            className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-300 ${
              isActivePlan
                ? "bg-[#E8F29E]/10 border border-[#E8F29E]/20 text-[#E8F29E] cursor-default"
                : p.popular
                ? "bg-[#E8F29E] hover:bg-[#d9e28f] text-[#0A231C] font-bold hover:scale-[1.02] shadow-[0_4px_14px_rgba(232,242,158,0.2)]"
                : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
            } disabled:opacity-50`}
          >
            {isActivePlan
              ? "Active Plan"
              : loadingPlan === p.id
              ? "Upgrading..."
              : "Upgrade Now"}
          </button>
        </div>
      );
    })}
  </div>
  ```

- [ ] **Step 3: Verification**
  Run: `npx tsc --noEmit`
  Expected: Compile success. Open the Upgrade modal in browser and verify colors.

- [ ] **Step 4: Commit**
  ```bash
  git add components/UpgradeModal.tsx
  git commit -m "style: redesign UpgradeModal using dark green background and lime accents"
  ```

---

### Task 4: Dashboard Metrics and Page Redesign

**Files:**
- Modify: `app/(main)/dashboard/page.tsx`

- [ ] **Step 1: Update Free Plan Gate visual panel styling**
  Modify [page.tsx](file:///c:/Users/LENOVO/CS%20PREP/app/%28main%29/dashboard/page.tsx). Change the Free Plan Gate styling to match the Forest Green & Lime colors (replace orange background accents, borders, and texts).
  
  Update Free Plan Gate rendering (around lines 41-91):
  ```typescript
  if (plan === "free") {
    return (
      <div className="min-h-screen pb-12 flex flex-col bg-[#0A231C]">
        <TopBar 
          title="My Dashboard" 
          subtitle="Track your progress and identify weak areas" 
          breadcrumbs={[{ label: "Home" }, { label: "Dashboard", href: "/dashboard" }]} 
        />
        <div className="flex-grow flex items-center justify-center p-8">
          <div className="w-full max-w-2xl bg-[#0e352a] border border-[rgba(232,242,158,0.08)] rounded-2xl p-8 md:p-10 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-[#E8F29E]/10 border border-[#E8F29E]/30 rounded-full flex items-center justify-center text-[#E8F29E] mx-auto">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white font-sora tracking-tight">
                Premium Access Required
              </h2>
              <p className="text-sm text-[#a8bcb5] max-w-md mx-auto leading-relaxed font-inter">
                Performance analytics, progress tracking, average scores, and weak-topic analysis are exclusive premium features. 
              </p>
            </div>
            <div className="bg-[#061814]/55 border border-[rgba(232,242,158,0.08)] rounded-xl p-5 text-left max-w-md mx-auto">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 font-sora">
                What you unlock with Premium:
              </h4>
              <ul className="space-y-2 text-xs text-[#a8bcb5] font-inter">
                <li className="flex items-center gap-2">✓ Unlimited AI Question Papers</li>
                <li className="flex items-center gap-2">✓ Unlimited Answer Sheet Evaluations</li>
                <li className="flex items-center gap-2">✓ Detailed performance progress charts</li>
                <li className="flex items-center gap-2">✓ Automated mistake pattern recognition</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setIsUpgradeOpen(true)}
                className="w-full sm:w-auto bg-[#E8F29E] hover:bg-[#d9e28f] text-[#0A231C] px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 whitespace-nowrap font-inter"
              >
                Upgrade to Premium
              </button>
              <Link
                href="/generate"
                className="w-full sm:w-auto border border-[#E8F29E] text-[#E8F29E] hover:bg-[#E8F29E] hover:text-[#0A231C] px-8 py-3 rounded-xl font-semibold text-sm transition-colors text-center font-inter"
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
  ```

- [ ] **Step 2: Update StatCard layout, font sizes, and loading spinners**
  Update the loading spin color (lines 35-37 and 95-97) to match lime `#E8F29E`.
  Modify the `StatCard` function component (around lines 309-318) to use `#0e352a` bg, `rgba(232, 242, 158, 0.08)` border, Sora font, and appropriate text coloring.
  
  ```typescript
  function StatCard({ title, value, valueClass = "text-white" }: { title: string, value: string, valueClass?: string }) {
    return (
      <div className="bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm hover:shadow-md transition-all">
        <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-2 font-inter">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold font-sora ${valueClass}`}>{value}</span>
        </div>
      </div>
    );
  }
  ```
  
  Update dashboard content render function `valueClass` variables (around line 125-136) to use `#E8F29E` (lime) and `#ff6b6b` (crimson) instead of blue/red:
  ```typescript
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <StatCard title="Total Papers Generated" value={stats.totalPapersGenerated.toString()} />
    <StatCard 
      title="Average Score" 
      value={`${stats.avgScorePercent.toFixed(1)}%`} 
      valueClass={stats.avgScorePercent >= 70 ? "text-[#E8F29E]" : stats.avgScorePercent >= 50 ? "text-orange-400" : "text-[#ff6b6b]"}
    />
    <StatCard title="Total Evaluations" value={stats.totalEvaluations.toString()} />
    <StatCard 
      title="Weakest Subject" 
      value={stats.weakestSubject ? stats.weakestSubject : "-"} 
      valueClass="text-[#ff6b6b] text-lg"
    />
  </div>
  ```

- [ ] **Step 3: Update Progress Section & Common Mistakes Box**
  Update the Subject Progress and Common Mistakes components (around lines 138-187) to dark theme styling, using `#0e352a` card wrappers, `#a8bcb5` text, and `#E8F29E` for progress bars and dots.
  
  Replace columns grid inside `Dashboard`:
  ```typescript
  {/* TWO COLUMN ROW: Progress & Mistakes */}
  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 reveal stagger-2">
    <div className="md:col-span-7 bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-4 font-sora">Subject Progress</h3>
      <div className="space-y-4">
        {subjectProgress.length === 0 ? <p className="text-sm text-[#a8bcb5] font-inter">No evaluations yet.</p> : null}
        {subjectProgress.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-sm font-medium text-white font-inter">
              <span>{item.subject}</span>
              <span className={item.avg >= 70 ? "text-[#E8F29E]" : item.avg >= 50 ? "text-orange-400" : "text-[#ff6b6b]"}>{item.avg.toFixed(0)}%</span>
            </div>
            <div className="bg-[#061814] rounded-full h-2 overflow-hidden">
              <div 
                className="bg-[#E8F29E] h-full rounded-full transition-all duration-1000"
                style={{ width: `${item.avg}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="md:col-span-5 bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-4 font-sora">Common Mistakes</h3>
      {mistakes.length === 0 ? (
        <p className="text-sm text-[#a8bcb5] font-inter">No mistakes recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {mistakes.map((m, idx) => (
            <li key={idx} className="flex items-start justify-between gap-2 text-sm text-white font-inter">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E8F29E] mt-1 shrink-0" />
                <span className="line-clamp-1">{m.desc}</span>
              </span>
              <span className="bg-[#E8F29E]/10 text-[#E8F29E] px-2 py-0.5 rounded-full text-xs font-medium shrink-0 font-sora">{m.count}</span>
            </li>
          ))}
        </ul>
      )}
      {mistakes.length > 0 && (
        <div className="mt-6 p-4 bg-[#061814]/60 border border-[rgba(232,242,158,0.08)] rounded-lg">
          <p className="text-sm text-[#a8bcb5] flex items-start gap-2 font-inter">
            <AlertCircle className="w-4 h-4 text-[#E8F29E] shrink-0 mt-0.5" />
            <span><strong>Tip:</strong> Most of your deductions come from {mistakes[0].desc}. Try to focus on this area.</span>
          </p>
        </div>
      )}
    </div>
  </div>
  ```

- [ ] **Step 4: Update History Table Styling**
  Update the Recent History table styles to use Inter for rows and matching forest green border/bg rules.
  
  Replace lines 189-245 with:
  ```typescript
  {/* HISTORY TABLE */}
  <div className="bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm reveal stagger-3">
    <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-4 font-sora">Recent History</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-[#a8bcb5] border-b border-[rgba(232,242,158,0.08)] font-inter">
          <tr>
            <th className="py-3 font-medium">Date</th>
            <th className="py-3 font-medium">Type</th>
            <th className="py-3 font-medium">Subject</th>
            <th className="py-3 font-medium">Score</th>
            <th className="py-3 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(232,242,158,0.05)] font-inter">
          {[...genSessions, ...evalSessions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((session, i) => (
            <tr key={i} className="text-white hover:bg-white/[0.01]">
              <td className="py-3">{new Date(session.date).toLocaleDateString()}</td>
              <td className="py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.type === 'generate' ? 'bg-[#E8F29E]/10 text-[#E8F29E]' : 'bg-emerald-950 text-emerald-400'}`}>
                  {session.type === 'generate' ? 'Generate' : 'Evaluate'}
                </span>
              </td>
              <td className="py-3">{session.subject}</td>
              <td className="py-3 font-medium">
                {session.type === 'evaluate' ? (
                  <span className={((session.marks_awarded / session.total_marks) * 100) >= 70 ? "text-[#E8F29E]" : ((session.marks_awarded / session.total_marks) * 100) >= 50 ? "text-orange-400" : "text-[#ff6b6b]"}>
                    {session.marks_awarded} / {session.total_marks}
                  </span>
                ) : (
                  <span className="text-[#a8bcb5]">Paper Only</span>
                )}
              </td>
              <td className="py-3">
                {session.type === 'evaluate' ? (
                  <Link href={`/evaluate?sessionId=${session.id}`} className="text-[#E8F29E] hover:underline font-medium transition-colors">
                    View Feedback
                  </Link>
                ) : (
                  <button className="text-[#E8F29E] hover:underline font-medium transition-colors cursor-pointer">Regenerate</button>
                )}
              </td>
            </tr>
          ))}
          {genSessions.length === 0 && evalSessions.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-[#a8bcb5]">No activity yet. Generate a paper to get started.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
  ```

- [ ] **Step 5: Redesign SVG Score Trend & Action Recommendation boxes**
  Update the Score Trend chart to render gradient overlays with `#E8F29E` colors, and change recommended boxes to forest colors.
  
  Replace lines 246-307 with:
  ```typescript
  {/* TWO COLUMN ROW: Chart & Recommendations */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 reveal stagger-4">
    
    <div className="bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-4 font-sora">Score Trend</h3>
      {evalSessions.length < 3 ? (
        <div className="h-[200px] flex items-center justify-center border border-dashed border-[rgba(232,242,158,0.08)] rounded-lg">
          <p className="text-sm text-[#a8bcb5] font-inter">Complete more evaluations to see trend</p>
        </div>
      ) : (
        <div className="h-[200px] relative w-full overflow-hidden flex items-end">
          {/* SVG Chart */}
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8F29E" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#E8F29E" stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 0 50 L 100 50" stroke="rgba(232,242,158,0.08)" strokeWidth="0.5" strokeDasharray="2 2" fill="none" />
            <path 
              d={`M 0 100 ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `L ${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' ')} L 100 100 Z`} 
              fill="url(#chartGradient)" 
            />
            <path 
              d={`M ${evalSessions.slice(0, 20).reverse().map((s, i, arr) => `${(i / (arr.length - 1)) * 100} ${100 - ((s.marks_awarded / s.total_marks) * 100)}`).join(' L ')}`} 
              stroke="#E8F29E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" 
            />
          </svg>
        </div>
      )}
    </div>

    <div className="bg-[#0e352a] rounded-xl border border-[rgba(232,242,158,0.08)] p-6 shadow-sm">
      <h3 className="text-xs font-semibold text-[#a8bcb5] uppercase tracking-wider mb-4 font-sora">Recommended Next Steps</h3>
      <div className="space-y-4">
        <div className="border-l-4 border-[#ff6b6b] bg-[#061814]/60 p-4 rounded-r-lg border-y border-r border-[rgba(232,242,158,0.05)]">
          <div className="flex gap-3">
            <Target className="w-5 h-5 text-[#ff6b6b] shrink-0" />
            <div className="font-inter">
              <h4 className="text-sm font-bold text-white font-sora">Focus on {stats.weakestSubject !== "None" ? stats.weakestSubject : "a subject"}</h4>
              <p className="text-xs text-[#a8bcb5] mt-1 mb-2">This is currently your weakest area.</p>
              <Link href={`/generate`} className="text-xs font-semibold text-[#E8F29E] hover:underline transition-all">
                Generate Practice Paper &rarr;
              </Link>
            </div>
          </div>
        </div>
        <div className="border-l-4 border-[#E8F29E] bg-[#061814]/60 p-4 rounded-r-lg border-y border-r border-[rgba(232,242,158,0.05)]">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-[#E8F29E] shrink-0" />
            <div className="font-inter">
              <h4 className="text-sm font-bold text-white font-sora">Review Common Mistakes</h4>
              <p className="text-xs text-[#a8bcb5] mt-1 mb-2">You frequently miss specific legal provisions.</p>
              <Link href={`/evaluate`} className="text-xs font-semibold text-[#E8F29E] hover:underline transition-all">
                Practice Writing Answers &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 6: Verification**
  Run: `npx tsc --noEmit`
  Expected: Compile successfully. Check layout at `http://localhost:3000/dashboard` under both free and premium states (using test profiles if needed) to ensure zero page bleed or misalignment.

- [ ] **Step 7: Commit**
  ```bash
  git add app/\(main\)/dashboard/page.tsx
  git commit -m "feat: redesign Dashboard page using new dark forest green cards and lime accent lines"
  ```

---

### Task 5: Production Build and Quality Verification

- [ ] **Step 1: Complete production check and build verification**
  Run compilation and build checkers to ensure zero Next.js static generation errors:
  ```bash
  npx tsc --noEmit
  npm run build
  ```
  Expected: Success without warnings or failures.

- [ ] **Step 2: Commit all updates and push**
  Push all updates to Git repository:
  ```bash
  git push origin main
  ```
  Expected: Pushed successfully to Github.
