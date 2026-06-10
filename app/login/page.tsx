"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      // router.push is handled by AuthProvider automatically
    } catch (err: any) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark bg-[#0a0a0a] min-h-screen text-on-surface flex flex-col font-body-md" style={{ background: 'radial-gradient(circle at top center, #161616 0%, #0a0a0a 100%)' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
            background: rgba(22, 22, 22, 0.7);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }
        .input-glow:focus {
            box-shadow: 0 0 0 2px rgba(161, 201, 253, 0.2);
        }
        .glow-hover:hover {
            box-shadow: 0 0 20px rgba(232, 89, 12, 0.3);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}} />

      {/* Navigation Shell */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-center px-margin_mobile md:px-margin_desktop h-16">
        <div className="flex items-center gap-2 cursor-pointer active:scale-95 group">
          <span className="material-symbols-outlined text-primary font-headline-lg text-headline-lg">menu_book</span>
          <span className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">CS Prep</span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-margin_mobile">
        <div className="w-full max-w-[480px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="glass-card rounded-xl p-8 md:p-10">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-surface-container-low rounded-lg mb-8 border border-white/5">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-colors ${isLogin ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Log In
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 font-label-md text-label-md rounded-md transition-colors ${!isLogin ? 'bg-surface-variant text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Sign Up
              </button>
            </div>

            <div className="text-center mb-8">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-2">
                {isLogin ? "Welcome Back" : "Create your account"}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {isLogin ? "Continue your journey to mastery." : "Join the next generation of master developers."}
              </p>
            </div>

            {/* Social Auth */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-all active:scale-95">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="currentColor"></path></svg>
                <span className="font-label-md text-label-md">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-all active:scale-95">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.06.75.79-.02 2.05-.88 3.52-.73 1.58.17 2.73.79 3.41 1.83-3.12 1.88-2.63 6.02.57 7.33-.61 1.54-1.43 3.09-2.56 3.79zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.26 2.47-2.14 4.41-3.74 4.25z" fill="currentColor"></path></svg>
                <span className="font-label-md text-label-md">Apple</span>
              </button>
            </div>

            <div className="relative flex items-center mb-8">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="flex-shrink mx-4 text-on-surface-variant font-label-md text-label-md uppercase tracking-widest text-[10px]">OR CONTINUE WITH EMAIL</span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm font-medium text-center">
                  {error}
                </div>
              )}

              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant px-1 uppercase">Full Name</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md focus:outline-none focus:border-primary input-glow transition-all placeholder:text-surface-variant" 
                    placeholder="John Doe" 
                    type="text" 
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant px-1 uppercase">Email Address</label>
                <div className="relative group">
                  <input 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md focus:outline-none focus:border-primary input-glow transition-all placeholder:text-surface-variant" 
                    placeholder="name@company.com" 
                    type="email" 
                    required
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors">alternate_email</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant px-1 uppercase">Password</label>
                <div className="relative group">
                  <input 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-body-md font-body-md focus:outline-none focus:border-primary input-glow transition-all placeholder:text-surface-variant" 
                    placeholder="••••••••" 
                    type="password" 
                    required
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors" type="button">
                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                  </button>
                </div>
                {isLogin && (
                  <div className="flex justify-end pt-2">
                    <a className="text-label-md font-label-md text-primary hover:text-primary/80 transition-colors" href="#">Forgot Password?</a>
                  </div>
                )}
                {!isLogin && (
                  <div className="pt-2 px-1">
                    <div className="flex gap-1.5 mb-1.5">
                      <div className="h-1 flex-1 rounded-full bg-surface-container-highest"></div>
                      <div className="h-1 flex-1 rounded-full bg-surface-container-highest"></div>
                      <div className="h-1 flex-1 rounded-full bg-surface-container-highest"></div>
                      <div className="h-1 flex-1 rounded-full bg-surface-container-highest"></div>
                    </div>
                    <span className="text-[10px] font-label-md text-on-surface-variant tracking-wider">ENTER AT LEAST 8 CHARACTERS</span>
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="flex items-start gap-3 py-2">
                  <div className="relative flex items-center">
                    <input className="w-5 h-5 rounded bg-surface-container-lowest border-outline-variant text-brand-accent focus:ring-brand-accent/20 cursor-pointer transition-all" id="terms" type="checkbox" />
                  </div>
                  <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="terms">
                    I agree to the <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                  </label>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#e8590c] hover:bg-[#c94d0a] text-white font-title-md text-title-md py-4 rounded-lg shadow-lg hover:shadow-brand-accent/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 glow-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : (isLogin ? "Sign In" : "Create Account")}
                {!loading && isLogin && <span className="material-symbols-outlined text-xl">login</span>}
              </button>
            </form>
          </div>
          
          <p className="text-center font-body-md text-body-md text-on-surface-variant">
            {isLogin ? "Don't have an account?" : "Already have an account?"} 
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline ml-1">
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full py-8 border-t border-white/5 bg-background">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin_mobile md:px-margin_desktop gap-4">
          <span className="font-title-md text-title-md text-primary font-bold">CS Prep</span>
          <div className="flex gap-6">
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-opacity" href="#">Terms of Service</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-opacity" href="#">Privacy Policy</a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-opacity" href="#">Help Center</a>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant opacity-60">© 2024 CS Prep Mastery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
