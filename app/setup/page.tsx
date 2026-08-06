// app/setup/page.tsx — Database setup instructions
"use client";
import Link from "next/link";
import { useState } from "react";

const C = { blue:"#dc2626", green:"#22c55e", amber:"#f59e0b", red:"#ef4444" };

function Step({ n, title, done, children }: any) {
  const [open, setOpen] = useState(n <= 3);
  return (
    <div style={{ background:"#101624", border:`1px solid ${done?"rgba(34,197,94,.3)":"rgba(255,255,255,.08)"}`, borderRadius:14, overflow:"hidden", marginBottom:12 }}>
      <div onClick={() => setOpen(v=>!v)} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 20px", cursor:"pointer" }}>
        <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13, background:done?"rgba(34,197,94,.15)":"rgba(220,38,38,.15)", color:done?C.green:C.blue, border:`2px solid ${done?"rgba(34,197,94,.4)":"rgba(220,38,38,.4)"}` }}>
          {done ? "✓" : n}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color:"#e2e8f8" }}>{title}</div>
        </div>
        <span style={{ color:"#4e5875", fontSize:18 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding:"0 20px 20px", borderTop:"1px solid rgba(255,255,255,.06)" }}>{children}</div>}
    </div>
  );
}

function Code({ children }: any) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position:"relative", marginTop:8, marginBottom:8 }}>
      <pre style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"14px 16px", fontSize:12, color:"#e2e8f8", overflowX:"auto", margin:0, fontFamily:"monospace" }}>
        {children}
      </pre>
      <button onClick={() => { navigator.clipboard?.writeText(children); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
        style={{ position:"absolute", top:8, right:8, background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.15)", borderRadius:6, color:"#e2e8f8", fontSize:10, fontWeight:600, cursor:"pointer", padding:"3px 9px" }}>
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

function Note({ children, type="info" }: any) {
  const colors = { info:{ bg:"rgba(220,38,38,.08)", border:"rgba(220,38,38,.25)", c:"#dc2626", icon:"ℹ️" }, warn:{ bg:"rgba(245,158,11,.08)", border:"rgba(245,158,11,.25)", c:C.amber, icon:"⚠️" }, success:{ bg:"rgba(34,197,94,.08)", border:"rgba(34,197,94,.25)", c:C.green, icon:"✅" } };
  const t = colors[type as keyof typeof colors];
  return <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 14px", marginTop:10, fontSize:13, color:t.c, lineHeight:1.6 }}>{t.icon} {children}</div>;
}

export default function SetupPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#080c18", color:"#e2e8f8", fontFamily:"system-ui,-apple-system,sans-serif", padding:"40px 20px" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"#dc2626", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:"#e2e8f8" }}>TargetGlobal</div>
              <div style={{ fontSize:11, color:"#dc2626", fontFamily:"monospace" }}>SETUP GUIDE</div>
            </div>
          </div>
          <h1 style={{ fontWeight:900, fontSize:28, letterSpacing:"-.5px", marginBottom:8 }}>Database & App Setup</h1>
          <p style={{ color:"#7b88aa", fontSize:15, lineHeight:1.6 }}>
            Complete guide to setting up TargetGlobal from scratch — Firebase, environment variables, database seeding, and running all three apps.
          </p>
        </div>

        {/* Steps */}
        <Step n={1} title="Install Node.js" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>
            Node.js is required to run all three apps. Download and install the LTS version.
          </p>
          <div style={{ background:"rgba(220,38,38,.08)", border:"1px solid rgba(220,38,38,.2)", borderRadius:10, padding:"12px 16px", marginTop:12 }}>
            <div style={{ fontWeight:700, color:C.blue, marginBottom:6 }}>Download Node.js LTS</div>
            <a href="https://nodejs.org" target="_blank" style={{ color:C.blue, fontSize:13 }}>https://nodejs.org → Click "LTS" → Install</a>
          </div>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:12 }}>Verify installation by opening Command Prompt and running:</p>
          <Code>node --version{"\n"}npm --version</Code>
          <Note>Both commands should print version numbers. If they don't, restart your computer and try again.</Note>
        </Step>

        <Step n={2} title="Create a Firebase Project" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>
            TargetGlobal uses Firebase for authentication, database (Firestore), and real-time features.
          </p>
          <ol style={{ color:"#7b88aa", fontSize:13, lineHeight:2, paddingLeft:20 }}>
            <li>Go to <a href="https://console.firebase.google.com" target="_blank" style={{ color:C.blue }}>console.firebase.google.com</a></li>
            <li>Click <strong style={{ color:"#e2e8f8" }}>Add project</strong></li>
            <li>Name it <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>targetglobal</code></li>
            <li>Disable Google Analytics (optional) → <strong style={{ color:"#e2e8f8" }}>Create project</strong></li>
          </ol>
        </Step>

        <Step n={3} title="Enable Firebase Authentication" done={false}>
          <ol style={{ color:"#7b88aa", fontSize:13, lineHeight:2, paddingLeft:20, marginTop:14 }}>
            <li>In your Firebase project → left sidebar → <strong style={{ color:"#e2e8f8" }}>Build → Authentication</strong></li>
            <li>Click <strong style={{ color:"#e2e8f8" }}>Get started</strong></li>
            <li>Click <strong style={{ color:"#e2e8f8" }}>Email/Password</strong> → toggle <strong style={{ color:"#e2e8f8" }}>Enable</strong> → Save</li>
          </ol>
        </Step>

        <Step n={4} title="Create Firestore Database (Test Mode)" done={false}>
          <ol style={{ color:"#7b88aa", fontSize:13, lineHeight:2, paddingLeft:20, marginTop:14 }}>
            <li>Left sidebar → <strong style={{ color:"#e2e8f8" }}>Build → Firestore Database</strong></li>
            <li>Click <strong style={{ color:"#e2e8f8" }}>Create database</strong></li>
            <li>Select <strong style={{ color:"#e2e8f8" }}>Start in test mode</strong> ← important</li>
            <li>Choose your region → <strong style={{ color:"#e2e8f8" }}>Enable</strong></li>
          </ol>
          <Note type="warn">Test mode allows all reads/writes for 30 days — perfect for development. No payment required.</Note>
        </Step>

        <Step n={5} title="Get Firebase Configuration Keys" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>You need two sets of keys:</p>
          <div style={{ fontWeight:700, color:C.blue, marginTop:14, marginBottom:6 }}>Web App Keys (Public)</div>
          <ol style={{ color:"#7b88aa", fontSize:13, lineHeight:2, paddingLeft:20 }}>
            <li>Project Settings (gear icon) → <strong style={{ color:"#e2e8f8" }}>Your apps</strong></li>
            <li>Click the <strong style={{ color:"#e2e8f8" }}>&lt;/&gt;</strong> web icon → Register app as <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>targetglobal-web</code></li>
            <li>Copy the config object — you'll see <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>apiKey</code>, <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>authDomain</code>, etc.</li>
          </ol>
          <div style={{ fontWeight:700, color:C.blue, marginTop:14, marginBottom:6 }}>Service Account Key (Private — for seeding)</div>
          <ol style={{ color:"#7b88aa", fontSize:13, lineHeight:2, paddingLeft:20 }}>
            <li>Project Settings → <strong style={{ color:"#e2e8f8" }}>Service accounts</strong> tab</li>
            <li>Click <strong style={{ color:"#e2e8f8" }}>Generate new private key</strong> → Download</li>
            <li>Rename the file to <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>serviceAccountKey.json</code></li>
            <li>Place it in the <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>shopgrid-admin</code> folder</li>
          </ol>
          <Note type="warn">Never commit serviceAccountKey.json to GitHub. Add it to .gitignore.</Note>
        </Step>

        <Step n={6} title="Create .env.local Files" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>Create a <code style={{ background:"rgba(255,255,255,.1)", padding:"1px 6px", borderRadius:4 }}>.env.local</code> file in each app folder with your actual Firebase values:</p>
          <div style={{ fontWeight:700, color:"#e2e8f8", marginTop:16, marginBottom:6 }}>shopgrid-admin/.env.local  &  shopgrid-merchant-app/.env.local</div>
          <Code>{`NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`}</Code>
          <div style={{ fontWeight:700, color:"#e2e8f8", marginTop:16, marginBottom:6 }}>shopgrid-website/.env.local (public keys only)</div>
          <Code>{`NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef`}</Code>
        </Step>

        <Step n={7} title="Install Dependencies & Fix Admin Config" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, marginBottom:8 }}>Open 3 Command Prompt windows, one per app:</p>
          <Code>{`# Window 1 — Admin
cd shopgrid-admin
del postcss.config.js
del tailwind.config.js
npm install

# Window 2 — Merchant
cd shopgrid-merchant-app
npm install

# Window 3 — Website
cd shopgrid-website
npm install`}</Code>
          <Note type="warn">Deleting postcss.config.js and tailwind.config.js from the admin folder is required — otherwise the app fails to compile.</Note>
        </Step>

        <Step n={8} title="Seed the Database" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>
            The seed script creates 50 vendors, 60 products, 4 merchant accounts, wallets, orders, and all demo data. Run it once from the admin folder:
          </p>
          <Code>{`cd shopgrid-admin
npx tsx scripts/seed.ts`}</Code>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:10 }}>Successful output looks like:</p>
          <Code>{`🌱 TargetGlobal — Full Database Seed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 Auth users…
  ✅ admin@targetglobal.org
  ✅ alex@trendhive.com
  ...

🏭 Seeding 50 vendors…
  ✅ 50 vendors created

📦 Seeding 60 products…
  ✅ 60 products created

🎉 Database seed complete!`}</Code>
          <Note type="warn">If you see "invalid_grant" error — generate a fresh serviceAccountKey.json from Firebase Console → Project Settings → Service accounts.</Note>
        </Step>

        <Step n={9} title="Create Firestore Indexes" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, lineHeight:1.7 }}>
            Some queries require composite indexes. If you see a "requires an index" error in the browser console, click the link in the error to auto-create it. Or deploy all indexes at once:
          </p>
          <Code>{`npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:indexes`}</Code>
          <Note>Indexes take 1–3 minutes to build. Once green in the Firebase Console, refresh your app.</Note>
        </Step>

        <Step n={10} title="Start All Three Apps" done={false}>
          <p style={{ color:"#7b88aa", fontSize:13, marginTop:14, marginBottom:8 }}>Keep 3 Command Prompt windows open, each running one app:</p>
          <Code>{`# Admin Dashboard — http://localhost:3000
cd shopgrid-admin
npm run dev

# Merchant App — http://localhost:3001
cd shopgrid-merchant-app
npm run dev

# Marketing Website — http://localhost:3002
cd shopgrid-website
npm run dev`}</Code>
          <div style={{ marginTop:16, background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", borderRadius:12, padding:16 }}>
            <div style={{ fontWeight:700, color:C.green, marginBottom:10 }}>✅ Login Credentials (after seeding)</div>
            <div style={{ fontFamily:"monospace", fontSize:12, lineHeight:2, color:"#7b88aa" }}>
              <div><span style={{ color:C.blue }}>Admin:</span>    admin@targetglobal.org / Admin@1234!</div>
              <div><span style={{ color:C.blue }}>Merchant 1:</span> alex@trendhive.com / Merchant@1234!</div>
              <div><span style={{ color:C.blue }}>Merchant 2:</span> priya@gadgetnest.io / Merchant@1234!</div>
              <div><span style={{ color:C.blue }}>Merchant 3:</span> carlos@petpalace.com / Merchant@1234!</div>
              <div><span style={{ color:C.blue }}>Merchant 4:</span> fatima@stylehaus.com / Merchant@1234!</div>
            </div>
          </div>
        </Step>

        <Step n={11} title="Troubleshooting" done={false}>
          <div style={{ marginTop:14, display:"grid", gap:10 }}>
            {[
              { err:"Cannot find module 'tailwindcss'",     fix:"Delete postcss.config.js and tailwind.config.js from shopgrid-admin folder" },
              { err:"invalid_grant (Invalid JWT Signature)", fix:"Generate a new serviceAccountKey.json from Firebase → Project Settings → Service accounts" },
              { err:"FirebaseError: requires an index",      fix:"Click the URL in the error → Create Index in Firebase Console → wait 2 min" },
              { err:"Email already in use",                  fix:"The seed was already run. The script handles this gracefully — just re-run it" },
              { err:"Port 3000 already in use",              fix:"Run: npm run dev -- -p 3004  to use a different port" },
              { err:"Blank page / no products",             fix:"Run the seed script first. Without it, Firestore collections are empty" },
            ].map(item => (
              <div key={item.err} style={{ background:"#161e30", borderRadius:10, padding:"12px 14px" }}>
                <div style={{ fontFamily:"monospace", fontSize:11, color:C.red, marginBottom:4 }}>Error: {item.err}</div>
                <div style={{ fontSize:12, color:"#7b88aa" }}>→ {item.fix}</div>
              </div>
            ))}
          </div>
        </Step>

        <div style={{ marginTop:32, textAlign:"center" }}>
          <Link href="/login" style={{ display:"inline-block", padding:"13px 36px", borderRadius:12, background:"#dc2626", color:"#fff", fontWeight:700, fontSize:15, textDecoration:"none" }}>
            Go to Admin Login →
          </Link>
        </div>
      </div>
    </div>
  );
}
