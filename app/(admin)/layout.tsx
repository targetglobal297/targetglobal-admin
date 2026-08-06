// app/(admin)/layout.tsx — fixed: light/dark theme, language, deposit notifications
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

const LANGS = [
  {code:"en", label:"English",  flag:"🇬🇧"},
  {code:"es", label:"Español",  flag:"🇪🇸"},
  {code:"fr", label:"Français", flag:"🇫🇷"},
  {code:"de", label:"Deutsch",  flag:"🇩🇪"},
  {code:"ar", label:"العربية",  flag:"🇸🇦"},
  {code:"zh", label:"中文",      flag:"🇨🇳"},
];

const Icon = ({ d, size=15 }:{d:string;size?:number}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const IC = {
  dashboard:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  merchants:    "M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z",
  kyc:          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 12l2 2 4-4",
  vendors:      "M2 20a2 2 0 002 2h16a2 2 0 002-2V8l-7-6H4a2 2 0 00-2 2v16z M14 2v6h6",
  catalog:      "M4 6h16M4 10h16M4 14h16M4 18h16",
  storeProducts:"M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  orders:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2",
  placeOrder:   "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
  wallets:      "M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-5 M18 12a2 2 0 000 4h3v-4z",
  withdrawals:  "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  transactions: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  chat:         "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  settings:     "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout:       "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  bell:         "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  broadcasts:    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.952 9.168-5v10c-1.543-3.048-5.068-5-9.168-5H7a3.988 3.988 0 00-1.564.317z",
  sun:          "M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 8a4 4 0 100 8 4 4 0 000-8z",
  moon:         "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  menu:         "M3 6h18M3 12h18M3 18h18",
};

const NAV = [
  {href:"/dashboard",      icon:"dashboard",      label:"Dashboard"},
  {href:"/merchants",      icon:"merchants",      label:"Merchants"},
  {href:"/kyc",            icon:"kyc",            label:"KYC"},
  {href:"/vendors",        icon:"vendors",        label:"Vendors"},
  {href:"/catalog",        icon:"catalog",        label:"Catalog"},
  {href:"/store-products", icon:"storeProducts",  label:"Store Products"},
  {href:"/orders",         icon:"orders",         label:"Orders"},
  {href:"/place-order",    icon:"placeOrder",     label:"Place Order"},
  {href:"/wallets",        icon:"wallets",        label:"Wallets"},
  {href:"/withdrawals",    icon:"withdrawals",    label:"Withdrawals"},
  {href:"/transactions",   icon:"transactions",   label:"Transactions"},
  {href:"/chat",           icon:"chat",           label:"Live Chat"},
  {href:"/broadcasts", icon:"broadcasts",         label:"Broadcasts"},
  {href:"/settings",       icon:"settings",       label:"Settings"},
];

export default function AdminLayout({children}:{children:React.ReactNode}){
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<any>(null);
  const [checking, setChecking]     = useState(true);
  const [open, setOpen]             = useState(false);
  const [dark, setDark]             = useState(true); // default dark
  const [lang, setLang]             = useState("en");
  const [showLang, setShowLang]     = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [pendingKyc,  setPendingKyc]  = useState(0);
  const [pendingWd,   setPendingWd]   = useState(0);
  const [unreadChat,  setUnreadChat]  = useState(0);
  const [pendingStores,setPendingStores]=useState(0);
  const [depositReqs, setDepositReqs] = useState<any[]>([]);

  // Theme colours — applied via CSS variables
  const T = dark ? {
    bg:"#080c18", surface:"#101624", card:"#161e30",
    border:"rgba(255,255,255,.08)", text:"#e2e8f8",
    muted:"#7b88aa", faint:"#4e5875", accent:"#dc2626",
  } : {
    bg:"#f4f6fb", surface:"#ffffff", card:"#f8fafc",
    border:"#e5e9f5", text:"#111827",
    muted:"#6b7280", faint:"#9ca3af", accent:"#1a56db",
  };

  const currentLang = LANGS.find(l=>l.code===lang)??LANGS[0];

  useEffect(()=>{
    return onAuthStateChanged(auth, async u=>{
      if(!u){router.replace("/login");return;}
      const snap=await getDoc(doc(db,"users",u.uid));
      if(!snap.exists()||snap.data().role!=="super_admin"){
        await signOut(auth);router.replace("/login");return;
      }
      setUser({email:u.email??"",name:snap.data().displayName??"Admin"});
      setChecking(false);
    });
  },[router]);

  useEffect(()=>{
    const s1=onSnapshot(query(collection(db,"kyc_submissions"),where("status","==","pending")),s=>setPendingKyc(s.size));
    const s2=onSnapshot(query(collection(db,"withdrawals"),where("status","==","pending")),s=>setPendingWd(s.size));
    const s3=onSnapshot(query(collection(db,"chat_rooms")),s=>setUnreadChat(s.docs.reduce((a,d)=>a+(d.data().unreadAdmin??0),0)));
    const s4=onSnapshot(query(collection(db,"stores"),where("status","==","pending")),s=>setPendingStores(s.size));
    const s5=onSnapshot(query(collection(db,"deposit_requests"),where("status","==","pending")),s=>setDepositReqs(s.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{s1();s2();s3();s4();s5();};
  },[]);

  const totalAlerts = pendingKyc+pendingWd+depositReqs.length+pendingStores;

  if(checking) return(
    <div style={{minHeight:"100vh",background:"#080c18",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid rgba(220,38,38,.3)",borderTopColor:"#dc2626",animation:"spin 1s linear infinite"}}/>
    </div>
  );

  const Sidebar=({mobile=false})=>(
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:T.surface,borderRight:`1px solid ${T.border}`,transition:"background .2s"}}>
      {/* Brand */}
      <div style={{padding:"16px 14px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:T.text,letterSpacing:"-.3px"}}>TargetGlobal</div>
            <div style={{fontSize:9,color:T.accent,fontFamily:"monospace",letterSpacing:"1px"}}>SUPER ADMIN</div>
          </div>
          {mobile&&<button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"transparent",border:"none",color:T.muted,cursor:"pointer",fontSize:20,lineHeight:1}}>✕</button>}
        </div>
      </div>

      {/* Live status */}
      <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:dark?"rgba(34,197,94,.08)":"rgba(22,163,74,.08)",borderRadius:8,border:"1px solid rgba(34,197,94,.15)"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 8px #22c55e"}}/>
          <span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>All Systems Live</span>
        </div>
      </div>

      {/* Deposit request alert */}
      {depositReqs.length>0&&(
        <div style={{margin:"8px 10px",padding:"8px 12px",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.25)",borderRadius:9}}>
          <div style={{fontSize:11,fontWeight:700,color:"#22c55e",marginBottom:3}}>
            📥 {depositReqs.length} Deposit Request{depositReqs.length>1?"s":""}
          </div>
          <Link href="/wallets" onClick={()=>mobile&&setOpen(false)} style={{fontSize:10,color:T.accent,textDecoration:"none",fontWeight:600}}>Review in Wallets →</Link>
        </div>
      )}

      {/* Nav */}
      <nav style={{flex:1,padding:"8px",overflowY:"auto"}}>
        {NAV.map(n=>{
          const isActive=pathname===n.href||pathname.startsWith(n.href+"/");
          const badges:Record<string,number>={"/kyc":pendingKyc,"/withdrawals":pendingWd,"/chat":unreadChat,"/merchants":pendingStores,"/wallets":depositReqs.length};
          const badge=badges[n.href]??0;
          return(
            <Link key={n.href} href={n.href} onClick={()=>mobile&&setOpen(false)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:9,marginBottom:1,
                textDecoration:"none",transition:"all .15s",
                background:isActive?dark?"rgba(220,38,38,.14)":"rgba(26,86,219,.08)":"transparent",
                color:isActive?T.accent:T.muted,fontWeight:isActive?600:400,fontSize:13,
                borderLeft:isActive?`2px solid ${T.accent}`:"2px solid transparent"}}>
              <span style={{flexShrink:0,opacity:isActive?1:.7}}><Icon d={(IC as any)[n.icon]} size={15}/></span>
              <span style={{flex:1}}>{n.label}</span>
              {badge>0&&<span style={{background:"#ef4444",color:"#fff",fontFamily:"monospace",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:99}}>{badge}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{padding:"10px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:T.card,borderRadius:9}}>
          <div style={{width:30,height:30,borderRadius:8,background:"#dc2626",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {user?.name?.slice(0,2).toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.name}</div>
            <div style={{fontSize:10,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
          </div>
          <button onClick={async()=>{await signOut(auth);router.replace("/login");}} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",padding:4}}>
            <Icon d={IC.logout} size={14}/>
          </button>
        </div>
      </div>
    </div>
  );

  const isChat=pathname==="/chat";

  return(
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,color:T.text,transition:"background .2s,color .2s",fontFamily:"system-ui,-apple-system,sans-serif"}}>
      {/* Desktop sidebar */}
      <aside style={{width:224,flexShrink:0,height:"100vh",position:"sticky",top:0,overflowY:"auto",display:"none"}} id="admin-desk">
        <Sidebar/>
      </aside>

      {/* Mobile drawer */}
      {open&&<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:40}}/>
        <aside style={{position:"fixed",left:0,top:0,bottom:0,width:244,zIndex:50,overflowY:"auto"}}>
          <Sidebar mobile/>
        </aside>
      </>}

      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* ── TOPBAR ── */}
        <header style={{height:54,background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 16px",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,flexShrink:0,transition:"background .2s",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setOpen(true)} style={{background:"transparent",border:"none",color:T.muted,cursor:"pointer",padding:4,display:"flex",alignItems:"center"}}>
              <Icon d={IC.menu} size={20}/>
            </button>
            <div style={{fontWeight:700,fontSize:15,color:T.text}}>
              {NAV.find(n=>pathname===n.href||pathname.startsWith(n.href+"/"))?.label??"Admin"}
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Language selector */}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setShowLang(v=>!v);setShowNotifs(false);}}
                style={{display:"flex",alignItems:"center",gap:5,background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",color:T.muted,fontSize:12,fontWeight:600}}>
                <span style={{fontSize:15}}>{currentLang.flag}</span>
                <span style={{fontSize:11}}>{currentLang.label}</span>
                <span style={{fontSize:8}}>▼</span>
              </button>
              {showLang&&(
                <div style={{position:"absolute",right:0,top:38,background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.2)",zIndex:60,overflow:"hidden",minWidth:155}}>
                  {LANGS.map(l=>(
                    <div key={l.code} onClick={()=>{setLang(l.code);setShowLang(false);}}
                      style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",cursor:"pointer",
                        background:lang===l.code?dark?"rgba(220,38,38,.15)":"rgba(26,86,219,.08)":"transparent",
                        color:lang===l.code?T.accent:T.muted,fontSize:13}}>
                      <span style={{fontSize:18}}>{l.flag}</span>
                      <span style={{flex:1}}>{l.label}</span>
                      {lang===l.code&&<span style={{fontSize:11}}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button onClick={()=>setDark(v=>!v)}
              style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Icon d={dark?IC.sun:IC.moon} size={16}/>
            </button>

            {/* Notification bell */}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setShowNotifs(v=>!v);setShowLang(false);}}
                style={{width:34,height:34,borderRadius:9,border:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                <Icon d={IC.bell} size={16}/>
                {totalAlerts>0&&<span style={{position:"absolute",top:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{totalAlerts}</span>}
              </button>
              {showNotifs&&(
                <div style={{position:"absolute",right:0,top:42,width:300,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,boxShadow:"0 8px 32px rgba(0,0,0,.2)",zIndex:60,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:14,color:T.text}}>Admin Alerts</div>
                  <div style={{maxHeight:340,overflowY:"auto"}}>
                    {depositReqs.map(r=>(
                      <Link key={r.id} href="/wallets" onClick={()=>setShowNotifs(false)}
                        style={{display:"flex",alignItems:"flex-start",gap:10,padding:"11px 16px",borderBottom:`1px solid ${dark?"rgba(255,255,255,.04)":"#f9fafb"}`,background:"rgba(34,197,94,.06)",textDecoration:"none"}}>
                        <span style={{fontSize:20,flexShrink:0}}>📥</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{r.merchantName} — Deposit Request</div>
                          <div style={{fontSize:11,color:T.muted}}>{r.amount} {r.coin} ({r.network}) · Tap to review</div>
                        </div>
                      </Link>
                    ))}
                    {pendingKyc>0&&<Link href="/kyc" onClick={()=>setShowNotifs(false)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:`1px solid ${dark?"rgba(255,255,255,.04)":"#f9fafb"}`,textDecoration:"none"}}>
                      <span style={{fontSize:20}}>🪪</span>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{pendingKyc} KYC submission{pendingKyc>1?"s":""} pending review</div>
                    </Link>}
                    {pendingWd>0&&<Link href="/withdrawals" onClick={()=>setShowNotifs(false)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderBottom:`1px solid ${dark?"rgba(255,255,255,.04)":"#f9fafb"}`,textDecoration:"none"}}>
                      <span style={{fontSize:20}}>💸</span>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{pendingWd} withdrawal{pendingWd>1?"s":""} pending approval</div>
                    </Link>}
                    {unreadChat>0&&<Link href="/chat" onClick={()=>setShowNotifs(false)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",textDecoration:"none"}}>
                      <span style={{fontSize:20}}>💬</span>
                      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{unreadChat} unread merchant message{unreadChat>1?"s":""}</div>
                    </Link>}
                    {totalAlerts===0&&<div style={{padding:"24px 16px",textAlign:"center",color:T.muted,fontSize:13}}>No pending alerts</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={{width:32,height:32,borderRadius:8,background:"#dc2626",color:"#fff",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {user?.name?.slice(0,2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        {isChat
          ?<div style={{flex:1,overflow:"hidden"}}>{children}</div>
          :<main style={{flex:1,overflowY:"auto",padding:"22px 18px 48px"}}>{children}</main>
        }
      </div>

      <style>{`
        @media(min-width:768px){
          #admin-desk{display:block!important}
          header button:first-child{display:none!important}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}
