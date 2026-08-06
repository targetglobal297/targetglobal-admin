// app/(auth)/login/page.tsx — Clean admin login, no demo credentials shown
"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Please enter your email and password."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (!snap.exists() || snap.data().role !== "super_admin") {
        await auth.signOut();
        toast.error("Access denied. This portal is for administrators only.");
        setLoading(false); return;
      }
      await updateDoc(doc(db, "users", cred.user.uid), { lastLogin: serverTimestamp() });
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
        ? "Incorrect email or password. Please try again."
        : err.code === "auth/user-not-found"
        ? "No account found with this email."
        : err.code === "auth/too-many-requests"
        ? "Too many attempts. Please try again later."
        : "Sign in failed. Please check your connection.";
      toast.error(msg);
      setLoading(false);
    }
  }

  const inp = (val: string, set: (v: string) => void, type: string, ph: string, extra?: React.ReactNode) => (
    <div style={{ position:"relative", marginBottom:14 }}>
      <input
        type={type} value={val} onChange={e => set(e.target.value)}
        placeholder={ph} required autoComplete={type === "password" ? "current-password" : "email"}
        style={{
          width:"100%", padding:"13px 16px", paddingRight: extra ? 46 : 16,
          background:"rgba(255,255,255,.06)", border:"1.5px solid rgba(255,255,255,.1)",
          borderRadius:12, color:"#e2e8f8", fontSize:15, outline:"none",
          transition:"border .2s", boxSizing:"border-box" as const,
        }}
        onFocus={e => (e.target.style.borderColor = "#dc2626")}
        onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
      />
      {extra}
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh", background:"#080c18",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif",
      position:"relative", overflow:"hidden",
    }}>
      {/* Background decoration */}
      <div style={{ position:"absolute", top:-200, right:-200, width:500, height:500,
        borderRadius:"50%", background:"radial-gradient(circle,rgba(220,38,38,.12),transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-200, left:-200, width:500, height:500,
        borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,.1),transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:420, position:"relative" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{
            width:60, height:60, borderRadius:16, margin:"0 auto 16px",
            background:"#dc2626",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 32px rgba(220,38,38,.4)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <h1 style={{ fontWeight:900, fontSize:26, color:"#fff", letterSpacing:"-.5px", marginBottom:6 }}>
            TargetGlobal
          </h1>
          <p style={{ color:"rgba(255,255,255,.45)", fontSize:14 }}>Administration Portal</p>
        </div>

        {/* Card */}
        <div style={{
          background:"rgba(255,255,255,.04)",
          border:"1px solid rgba(255,255,255,.08)",
          borderRadius:20, padding:32,
          backdropFilter:"blur(12px)",
          boxShadow:"0 24px 64px rgba(0,0,0,.5)",
        }}>
          <h2 style={{ fontWeight:800, fontSize:20, color:"#e2e8f8", marginBottom:6 }}>Sign In</h2>
          <p style={{ color:"rgba(255,255,255,.4)", fontSize:13, marginBottom:24 }}>
            Enter your administrator credentials to continue.
          </p>

          <form onSubmit={handle}>
            {inp(email, setEmail, "email", "admin@example.com")}
            {inp(password, setPassword, showPw ? "text" : "password", "••••••••••",
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,.4)", cursor:"pointer", fontSize:16, padding:0 }}>
                {showPw ? "🙈" : "👁"}
              </button>
            )}

            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"14px", borderRadius:12, border:"none",
              background: loading ? "rgba(220,38,38,.4)" : "#dc2626",
              color:"#fff", fontWeight:700, fontSize:15, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 20px rgba(220,38,38,.4)",
              transition:"all .2s", marginBottom:14,
            }}>
              {loading ? "Signing in…" : "Sign In to Dashboard"}
            </button>
          </form>

          <div style={{ textAlign:"center", padding:"14px 0 0", borderTop:"1px solid rgba(255,255,255,.06)" }}>
            <p style={{ fontSize:12, color:"rgba(255,255,255,.25)", lineHeight:1.6 }}>
              Secured by Firebase Authentication.<br/>
              Unauthorized access is strictly prohibited.
            </p>
          </div>
        </div>

        {/* Setup guide link */}
        <div style={{ textAlign:"center", marginTop:20 }}>
          <a href="/setup" style={{ fontSize:12, color:"rgba(255,255,255,.3)", textDecoration:"none" }}>
            First time setup? View configuration guide →
          </a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        input::placeholder { color: rgba(255,255,255,.25); }
        input { color: #e2e8f8 !important; }
        * { box-sizing: border-box; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        div[style*='maxWidth:420'] { animation: fadeIn .4s ease; }
      `}}/>
    </div>
  );
}
