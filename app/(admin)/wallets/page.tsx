// app/(admin)/wallets/page.tsx — redesigned admin wallet page
"use client";
import { useState, useEffect } from "react";
import {
  collection, query, onSnapshot, orderBy, where,
  doc, updateDoc, getDocs, addDoc, serverTimestamp, limit,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import {
  useAllStores, useAllWallets, useAllWithdrawals,
  adjustWalletBalance, approveWithdrawal, rejectWithdrawal,
} from "@/lib/hooks";
import toast from "react-hot-toast";

// ── Tokens ────────────────────────────────────────────────────
const NAVY = "#0f172a";
const BLUE = "#dc2626";
const C    = { green:"#16a34a", red:"#dc2626", amber:"#d97706" };

const COIN_COLOR:Record<string,string> = { BTC:"#f7931a", ETH:"#627eea", USDT:"#26a17b" };
const COIN_SYMBOL:Record<string,string> = { BTC:"₿", ETH:"Ξ", USDT:"₮" };

const ADDR_TEMPLATES = [
  { coin:"BTC",  network:"Bitcoin",  placeholder:"bc1q…" },
  { coin:"ETH",  network:"Ethereum", placeholder:"0x…"   },
  { coin:"USDT", network:"TRC20",    placeholder:"T…"    },
  { coin:"USDT", network:"ERC20",    placeholder:"0x…"   },
];

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(ts:any):string {
  if (!ts) return "—";
  const d = ts?.toDate?.() ?? new Date(ts?.seconds ? ts.seconds*1000 : ts);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000)   return "just now";
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

// ── SVG icons ─────────────────────────────────────────────────
const Ico = ({d,s=14}:{d:string|string[],s?:number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {(Array.isArray(d)?d:[d]).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);
const I = {
  check:  "M20 6L9 17l-5-5",
  x:      "M18 6L6 18M6 6l12 12",
  eye:    ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  search: ["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"],
  wallet: ["M21 12V7H5a2 2 0 010-4h14v4","M3 5v14a2 2 0 002 2h16v-5","M18 12a2 2 0 000 4h4v-4z"],
  down:   "M12 5v14M5 12l7 7 7-7",
  up:     "M12 19V5M5 12l7-7 7 7",
  img:    ["M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z","M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"],
  info:   ["M12 22a10 10 0 100-20 10 10 0 000 20z","M12 8h.01","M12 12v4"],
};

// ── Status badge ──────────────────────────────────────────────
function Badge({status}:{status:string}) {
  const m:Record<string,{c:string,bg:string}> = {
    pending:  {c:C.amber,   bg:"rgba(217,119,6,.08)"},
    approved: {c:C.green,   bg:"rgba(22,163,74,.08)"},
    rejected: {c:C.red,     bg:"rgba(220,38,38,.08)"},
    completed:{c:C.green,   bg:"rgba(22,163,74,.08)"},
  };
  const s = m[status] ?? {c:"#64748b",bg:"rgba(100,116,139,.08)"};
  return (
    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,
      textTransform:"capitalize",color:s.c,background:s.bg,
      border:`1px solid ${s.c}25`,whiteSpace:"nowrap"}}>
      {status}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function Avatar({name,size=34}:{name:string,size?:number}) {
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:"rgba(220,38,38,.1)",color:BLUE,
      fontWeight:700,fontSize:size*0.35,
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      {initials}
    </div>
  );
}

// ── Receipt lightbox ──────────────────────────────────────────
function ReceiptModal({url,onClose}:{url:string,onClose:()=>void}) {
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",
        zIndex:300,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",zIndex:301,
        transform:"translate(-50%,-50%)",
        width:"min(560px,92vw)",maxHeight:"85dvh",
        background:"#fff",borderRadius:16,overflow:"hidden",
        boxShadow:"0 24px 60px rgba(0,0,0,.3)"}}>
        <div style={{padding:"14px 16px",borderBottom:"1px solid #f1f5f9",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:600,fontSize:14,color:NAVY}}>Payment Receipt</div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:7,
            border:"1px solid #e5e7eb",background:"#f9fafb",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b"}}>
            <Ico d={I.x} s={13}/>
          </button>
        </div>
        <div style={{overflowY:"auto",maxHeight:"70dvh",padding:16}}>
          <img src={url} alt="Receipt" style={{width:"100%",borderRadius:10,display:"block"}}/>
        </div>
        <div style={{padding:"10px 16px",borderTop:"1px solid #f1f5f9",textAlign:"center"}}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{fontSize:12,color:BLUE,fontWeight:600,textDecoration:"none"}}>
            Open full size ↗
          </a>
        </div>
      </div>
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function WalletsPage() {
  const { data: stores=[] }      = useAllStores();
  const { data: wallets=[] }     = useAllWallets();
  const { data: withdrawals=[] } = useAllWithdrawals();

  const [depositRequests, setDepositRequests] = useState<any[]>([]);
  const [recentDeposits,  setRecentDeposits]  = useState<any[]>([]);
  const [depositAddrs,    setDepositAddrs]    = useState<any[]>([]);
  const [editingAddr,     setEditingAddr]     = useState<Record<string,string>>({});
  const [savingAddr,      setSavingAddr]      = useState<string|null>(null);
  const [viewReceipt,     setViewReceipt]     = useState<string|null>(null);
  const [activeTab,       setActiveTab]       = useState<"deposits"|"withdrawals"|"wallets"|"addresses">("deposits");

  // Adjust form
  const [selWallet,  setSelWallet]  = useState<any>(null);
  const [adjType,    setAdjType]    = useState<"credit"|"debit">("credit");
  const [adjCoin,    setAdjCoin]    = useState("USDT");
  const [adjAmount,  setAdjAmount]  = useState("");
  const [adjReason,  setAdjReason]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [actingId,   setActingId]   = useState<string|null>(null);
  const [rejectId,   setRejectId]   = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(()=>{
    const u1 = onSnapshot(
      query(collection(db,"deposit_requests"),where("status","==","pending"),orderBy("requestedAt","desc")),
      s => setDepositRequests(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    const u2 = onSnapshot(
      query(collection(db,"deposit_requests"),where("status","!=","pending"),orderBy("status"),orderBy("requestedAt","desc"),limit(20)),
      s => setRecentDeposits(s.docs.map(d=>({id:d.id,...d.data()})))
    );
    return ()=>{ u1(); u2(); };
  },[]);

  useEffect(()=>{
    if(selWallet) {
      const q = query(collection(db,"deposit_addresses"),where("merchantId","==",selWallet.merchantId));
      return onSnapshot(q, s=>{
        const addrs = s.docs.map(d=>({id:d.id,...d.data()}));
        setDepositAddrs(addrs);
        const init:Record<string,string>={};
        addrs.forEach((a:any)=>{ init[`${a.coin}_${a.network}`]=a.address; });
        setEditingAddr(init);
      });
    }
  },[selWallet?.merchantId]);

  const getStoreName    = (merchantId:string) =>
    stores.find((s:any)=>s.merchantId===merchantId)?.storeName ?? "Unknown Store";
  const getMerchantName = (merchantId:string) =>
    stores.find((s:any)=>s.merchantId===merchantId)?.merchantName
    ?? stores.find((s:any)=>s.merchantId===merchantId)?.storeName
    ?? merchantId.slice(0,8);

  const totalPool    = wallets.reduce((a:number,w:any)=>a+(w.usdEquivalent??0),0);
  const pendingWd    = withdrawals.filter((w:any)=>w.status==="pending").length;
  const topWallets   = [...wallets].sort((a:any,b:any)=>(b.usdEquivalent??0)-(a.usdEquivalent??0)).slice(0,5);

  async function handleApproveDeposit(dep:any) {
    setActingId(dep.id);
    try {
      await updateDoc(doc(db,"deposit_requests",dep.id),{
        status:"approved", reviewedAt:serverTimestamp(),
        reviewedBy:auth.currentUser?.uid,
      });
      const store = stores.find((s:any)=>s.merchantId===dep.merchantId);
      await adjustWalletBalance({
        merchantId:   dep.merchantId,
        storeId:      dep.storeId ?? store?.id ?? "",
        merchantName: dep.merchantName ?? "",
        type:         "credit",
        amountUSD:    dep.usdValue ?? dep.amount,
        reason:       `Deposit approved: ${dep.amount} ${dep.coin}`,
        coin:         dep.coin,
        network:      dep.network,
      });
      toast.success(`Deposit approved — $${(dep.usdValue??dep.amount).toFixed(2)} credited`);
    } catch(e:any) { toast.error(e.message ?? "Failed."); }
    setActingId(null);
  }

  async function handleRejectDeposit(dep:any) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason."); return; }
    setActingId(dep.id);
    try {
      await updateDoc(doc(db,"deposit_requests",dep.id),{
        status:"rejected",
        rejectionReason:rejectReason,
        reviewedAt:serverTimestamp(),
        reviewedBy:auth.currentUser?.uid,
      });
      await addDoc(collection(db,"notifications"),{
        userId:dep.merchantId,title:"Deposit rejected",
        body:`Your deposit of ${dep.amount} ${dep.coin} was rejected. Reason: ${rejectReason}`,
        type:"deposit",read:false,createdAt:serverTimestamp(),
      });
      toast.success("Deposit rejected.");
      setRejectId(null); setRejectReason("");
    } catch { toast.error("Failed."); }
    setActingId(null);
  }

  async function handleApproveWd(wd:any) {
    setActingId(wd.id);
    try {
      await approveWithdrawal(wd.id, auth.currentUser?.uid ?? "");
      toast.success(`Withdrawal approved — ${wd.amount} ${wd.coin}`);
    } catch(e:any) { toast.error(e.message ?? "Failed."); }
    setActingId(null);
  }

  async function handleRejectWd(wd:any) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason."); return; }
    setActingId(wd.id);
    try {
      await rejectWithdrawal(wd.id, auth.currentUser?.uid ?? "", rejectReason);
      toast.success("Withdrawal rejected.");
      setRejectId(null); setRejectReason("");
    } catch { toast.error("Failed."); }
    setActingId(null);
  }

  async function handleAdjust() {
    if (!selWallet) { toast.error("Select a merchant wallet."); return; }
    const amt = parseFloat(adjAmount);
    if (isNaN(amt)||amt<=0) { toast.error("Enter a valid amount."); return; }
    if (!adjReason.trim()) { toast.error("Reason required."); return; }
    setSaving(true);
    try {
      const store = stores.find((s:any)=>s.merchantId===selWallet.merchantId);
      await adjustWalletBalance({
        merchantId:   selWallet.merchantId,
        storeId:      selWallet.storeId ?? store?.id ?? "",
        merchantName: selWallet.merchantName ?? "",
        type:         adjType,
        amountUSD:    amt,
        reason:       adjReason,
        coin:         adjCoin,
        network:      adjCoin==="BTC"?"Bitcoin":adjCoin==="ETH"?"Ethereum":"TRC20",
      });
      toast.success(`${adjType==="credit"?"Credited":"Debited"} $${amt.toFixed(2)}`);
      setAdjAmount(""); setAdjReason("");
    } catch(e:any) { toast.error(e.message ?? "Failed."); }
    setSaving(false);
  }

  async function saveAddr(coin:string, network:string) {
    if (!selWallet) return;
    const key = `${coin}_${network}`;
    const addr = editingAddr[key]?.trim();
    if (!addr) { toast.error("Enter an address."); return; }
    setSavingAddr(key);
    try {
      const q = query(collection(db,"deposit_addresses"),
        where("merchantId","==",selWallet.merchantId),
        where("coin","==",coin), where("network","==",network));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db,"deposit_addresses"),{
          merchantId:selWallet.merchantId, coin, network, address:addr,
          createdAt:serverTimestamp(),
        });
      } else {
        await updateDoc(snap.docs[0].ref,{ address:addr, updatedAt:serverTimestamp() });
      }
      toast.success(`${coin} ${network} address saved!`);
    } catch { toast.error("Failed to save."); }
    setSavingAddr(null);
  }

  const card:React.CSSProperties = {
    background:"#fff", border:"1px solid #e5e9f5",
    borderRadius:14, overflow:"hidden",
  };
  const inp:React.CSSProperties = {
    width:"100%", padding:"9px 12px", boxSizing:"border-box" as const,
    border:"1.5px solid #e5e7eb", borderRadius:9,
    fontSize:13, outline:"none", color:NAVY,
    background:"#fff", transition:"border .15s",
  };
  const lbl:React.CSSProperties = {
    display:"block", fontSize:10, fontWeight:700, color:"#64748b",
    marginBottom:5, textTransform:"uppercase" as const, letterSpacing:".6px",
  };

  const pendingDeposits = depositRequests.filter(d=>d.status==="pending");

  return (
    <div>
      {/* Receipt modal */}
      {viewReceipt && <ReceiptModal url={viewReceipt} onClose={()=>setViewReceipt(null)}/>}

      {/* Reject reason sheet */}
      {rejectId && (
        <>
          <div onClick={()=>{setRejectId(null);setRejectReason("");}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,backdropFilter:"blur(4px)"}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",zIndex:201,
            transform:"translate(-50%,-50%)",width:"min(400px,92vw)",
            background:"#fff",borderRadius:16,overflow:"hidden"}}>
            <div style={{height:3,background:C.red}}/>
            <div style={{padding:22}}>
              <div style={{fontWeight:700,fontSize:16,color:NAVY,marginBottom:6}}>Rejection reason</div>
              <p style={{fontSize:13,color:"#64748b",marginBottom:14}}>
                This will be sent to the merchant as a notification.
              </p>
              <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)}
                placeholder="e.g. Receipt unclear, amount doesn't match, wrong network…"
                style={{...inp,minHeight:80,resize:"vertical",fontFamily:"inherit",display:"block"}}
                onFocus={e=>(e.target.style.borderColor=C.red)}
                onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
                <button onClick={()=>{setRejectId(null);setRejectReason("");}}
                  style={{padding:"10px",borderRadius:10,border:"1.5px solid #e5e7eb",
                    background:"transparent",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  Cancel
                </button>
                <button
                  onClick={()=>{
                    const dep = depositRequests.find(d=>d.id===rejectId);
                    const wd  = withdrawals.find((w:any)=>w.id===rejectId);
                    if(dep) handleRejectDeposit(dep);
                    else if(wd) handleRejectWd(wd);
                  }}
                  disabled={!rejectReason.trim()||actingId===rejectId}
                  style={{padding:"10px",borderRadius:10,border:"none",
                    background:C.red,color:"#fff",fontWeight:700,fontSize:13,
                    cursor:"pointer",opacity:(!rejectReason.trim()||actingId===rejectId)?.5:1}}>
                  {actingId===rejectId?"Rejecting…":"Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Header ── */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontWeight:900,fontSize:22,color:NAVY,letterSpacing:"-.5px",marginBottom:3}}>
          Wallets
        </h1>
        <p style={{fontSize:13,color:"#64748b"}}>
          Manage merchant balances, deposits, withdrawals and deposit addresses
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}
        className="wallet-stats">
        {[
          {l:"Total pool",          v:`$${totalPool.toLocaleString("en-US",{maximumFractionDigits:0})}`, c:NAVY,    bg:"rgba(15,23,42,.06)", bd:"rgba(15,23,42,.12)"},
          {l:"Pending deposits",    v:pendingDeposits.length,   c:C.amber, bg:"rgba(217,119,6,.06)",  bd:"rgba(217,119,6,.18)"},
          {l:"Pending withdrawals", v:pendingWd,                c:C.amber, bg:"rgba(217,119,6,.06)",  bd:"rgba(217,119,6,.18)"},
          {l:"Active wallets",      v:wallets.length,           c:C.green, bg:"rgba(22,163,74,.06)",  bd:"rgba(22,163,74,.18)"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,border:`1px solid ${s.bd}`,
            borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:22,color:s.c,
              fontFamily:"monospace",marginBottom:3}}>{s.v}</div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:500}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16,alignItems:"start"}}
        className="wallet-cols">

        {/* ── LEFT: activity tabs ── */}
        <div>
          {/* Tab bar */}
          <div style={{display:"flex",gap:4,background:"#f1f5f9",
            borderRadius:10,padding:3,marginBottom:14}}>
            {([
              {k:"deposits",    l:"Deposits",    n:pendingDeposits.length},
              {k:"withdrawals", l:"Withdrawals", n:pendingWd},
              {k:"wallets",     l:"All Wallets", n:wallets.length},
              {k:"addresses",   l:"Addresses",   n:0},
            ] as const).map(t=>{
              const act = activeTab===t.k;
              return(
                <button key={t.k} onClick={()=>setActiveTab(t.k)}
                  style={{flex:1,padding:"8px 4px",borderRadius:8,border:"none",
                    cursor:"pointer",fontSize:11,fontWeight:act?700:500,
                    background:act?"#fff":"transparent",
                    color:act?NAVY:"#94a3b8",
                    boxShadow:act?"0 1px 4px rgba(0,0,0,.08)":"none",
                    transition:"all .15s",whiteSpace:"nowrap"}}>
                  {t.l}
                  {t.n>0&&(
                    <span style={{marginLeft:4,fontSize:10,fontFamily:"monospace",
                      color:act?BLUE:"#94a3b8"}}>
                      {t.n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── DEPOSITS TAB ── */}
          {activeTab==="deposits"&&(
            <>
              {/* Pending */}
              <div style={card}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #f1f5f9",
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.amber,
                    textTransform:"uppercase",letterSpacing:"1px"}}>
                    ● Pending ({pendingDeposits.length})
                  </div>
                </div>
                {pendingDeposits.length===0?(
                  <div style={{padding:"32px 24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>
                    No pending deposits
                  </div>
                ):pendingDeposits.map((dep:any)=>(
                  <div key={dep.id} style={{padding:"12px 16px",
                    borderBottom:"1px solid #f8fafc",
                    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <Avatar name={dep.merchantName ?? getMerchantName(dep.merchantId)} size={36}/>
                    <div style={{flex:1,minWidth:140}}>
                      <div style={{fontWeight:600,fontSize:13,color:NAVY,marginBottom:2}}>
                        {dep.merchantName ?? getMerchantName(dep.merchantId)}
                      </div>
                      <div style={{fontSize:11,color:"#64748b"}}>
                        {getStoreName(dep.merchantId)} · {dep.coin} {dep.network} · {fmtDate(dep.requestedAt)}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:COIN_COLOR[dep.coin]??NAVY,fontFamily:"monospace"}}>
                        {COIN_SYMBOL[dep.coin]??""}{dep.amount}
                      </div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>
                        ≈ ${(dep.usdValue??dep.amount).toFixed(2)}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap"}}>
                      {dep.receiptUrl&&(
                        <button onClick={()=>setViewReceipt(dep.receiptUrl)}
                          style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                            border:"1.5px solid rgba(220,38,38,.2)",
                            background:"rgba(220,38,38,.06)",color:BLUE,
                            fontSize:11,fontWeight:600,
                            display:"flex",alignItems:"center",gap:4}}>
                          <Ico d={I.eye} s={11}/>Receipt
                        </button>
                      )}
                      <button
                        onClick={()=>handleApproveDeposit(dep)}
                        disabled={actingId===dep.id}
                        style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                          border:"1.5px solid rgba(22,163,74,.25)",
                          background:"rgba(22,163,74,.06)",color:C.green,
                          fontSize:11,fontWeight:700,
                          display:"flex",alignItems:"center",gap:4,
                          opacity:actingId===dep.id?.5:1}}>
                        <Ico d={I.check} s={11}/>
                        {actingId===dep.id?"…":"Approve"}
                      </button>
                      <button
                        onClick={()=>{setRejectId(dep.id);setRejectReason("");}}
                        style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                          border:"1.5px solid rgba(220,38,38,.2)",
                          background:"rgba(220,38,38,.06)",color:C.red,
                          fontSize:11,fontWeight:700,
                          display:"flex",alignItems:"center",gap:4}}>
                        <Ico d={I.x} s={11}/>Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent */}
              {recentDeposits.length>0&&(
                <div style={{...card,marginTop:12}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid #f1f5f9",
                    fontSize:11,fontWeight:700,color:"#64748b",
                    textTransform:"uppercase",letterSpacing:"1px"}}>
                    Recently processed
                  </div>
                  {recentDeposits.slice(0,6).map((dep:any)=>(
                    <div key={dep.id} style={{padding:"10px 16px",
                      borderBottom:"1px solid #f8fafc",
                      display:"flex",alignItems:"center",gap:12}}>
                      <Avatar name={dep.merchantName ?? getMerchantName(dep.merchantId)} size={30}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:500,color:NAVY,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {dep.merchantName ?? getMerchantName(dep.merchantId)}
                        </div>
                        <div style={{fontSize:10,color:"#94a3b8"}}>
                          {dep.amount} {dep.coin} · {fmtDate(dep.requestedAt)}
                        </div>
                      </div>
                      <Badge status={dep.status}/>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── WITHDRAWALS TAB ── */}
          {activeTab==="withdrawals"&&(
            <div style={card}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid #f1f5f9",
                fontSize:11,fontWeight:700,color:"#64748b",
                textTransform:"uppercase",letterSpacing:"1px"}}>
                All withdrawals ({withdrawals.length})
              </div>
              {(withdrawals as any[]).length===0?(
                <div style={{padding:"32px 24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>
                  No withdrawals yet
                </div>
              ):(withdrawals as any[]).map((wd:any)=>(
                <div key={wd.id} style={{padding:"12px 16px",
                  borderBottom:"1px solid #f8fafc",
                  display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <Avatar name={wd.merchantName ?? getMerchantName(wd.merchantId)} size={34}/>
                  <div style={{flex:1,minWidth:140}}>
                    <div style={{fontWeight:600,fontSize:13,color:NAVY,marginBottom:2}}>
                      {wd.merchantName}
                    </div>
                    <div style={{fontSize:11,color:"#64748b",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>
                      → {wd.destinationAddress}
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>
                      {wd.coin} {wd.network} · {fmtDate(wd.requestedAt)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:COIN_COLOR[wd.coin]??NAVY,fontFamily:"monospace"}}>
                      {COIN_SYMBOL[wd.coin]??""}{wd.amount}
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>≈ ${(wd.usdValue??wd.amount).toFixed(2)}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}}>
                    {wd.status==="pending"?(
                      <>
                        <button onClick={()=>handleApproveWd(wd)} disabled={actingId===wd.id}
                          style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                            border:"1.5px solid rgba(22,163,74,.25)",
                            background:"rgba(22,163,74,.06)",color:C.green,
                            fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4,
                            opacity:actingId===wd.id?.5:1}}>
                          <Ico d={I.check} s={11}/>
                          {actingId===wd.id?"…":"Approve"}
                        </button>
                        <button onClick={()=>{setRejectId(wd.id);setRejectReason("");}}
                          style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                            border:"1.5px solid rgba(220,38,38,.2)",
                            background:"rgba(220,38,38,.06)",color:C.red,
                            fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                          <Ico d={I.x} s={11}/>Reject
                        </button>
                      </>
                    ):<Badge status={wd.status}/>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ALL WALLETS TAB ── */}
          {activeTab==="wallets"&&(
            <div style={card}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid #f1f5f9",
                fontSize:11,fontWeight:700,color:"#64748b",
                textTransform:"uppercase",letterSpacing:"1px"}}>
                All wallets ({wallets.length})
              </div>
              {(wallets as any[]).map((w:any,i:number)=>(
                <div key={w.id}
                  onClick={()=>{setSelWallet(w);setActiveTab("addresses");}}
                  style={{padding:"12px 16px",borderBottom:"1px solid #f8fafc",
                    display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="#fafafa")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <div style={{width:20,fontSize:11,fontWeight:600,
                    color:"#94a3b8",textAlign:"center",flexShrink:0}}>
                    {i+1}
                  </div>
                  <Avatar name={getMerchantName(w.merchantId)} size={34}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:NAVY,marginBottom:2,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {getMerchantName(w.merchantId)}
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>
                      {getStoreName(w.merchantId)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:NAVY,fontFamily:"monospace"}}>
                      ${(w.usdEquivalent??0).toFixed(2)}
                    </div>
                    {(w.balances?.USDT_TRC20>0||w.balances?.BTC>0||w.balances?.ETH>0)&&(
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>
                        {w.balances?.BTC>0&&`₿${w.balances.BTC.toFixed(5)} `}
                        {w.balances?.ETH>0&&`Ξ${w.balances.ETH.toFixed(4)} `}
                        {w.balances?.USDT_TRC20>0&&`₮${w.balances.USDT_TRC20.toFixed(2)}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── ADDRESSES TAB ── */}
          {activeTab==="addresses"&&(
            <div style={card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9"}}>
                <label style={lbl}>Select merchant</label>
                <select style={{...inp,marginBottom:0}}
                  value={selWallet?.merchantId??""}
                  onChange={e=>{
                    const w=(wallets as any[]).find((w:any)=>w.merchantId===e.target.value);
                    setSelWallet(w??null);
                  }}>
                  <option value="">Choose a merchant…</option>
                  {(wallets as any[]).map((w:any)=>(
                    <option key={w.id} value={w.merchantId}>
                      {getMerchantName(w.merchantId)} — {getStoreName(w.merchantId)}
                    </option>
                  ))}
                </select>
              </div>
              {selWallet?(
                <div style={{padding:16}}>
                  {ADDR_TEMPLATES.map(t=>{
                    const key = `${t.coin}_${t.network}`;
                    return(
                      <div key={key} style={{marginBottom:14}}>
                        <label style={lbl}>{t.coin} — {t.network}</label>
                        <div style={{display:"flex",gap:8}}>
                          <input style={{...inp,flex:1,fontFamily:"monospace",fontSize:12}}
                            placeholder={t.placeholder}
                            value={editingAddr[key]??""}
                            onChange={e=>setEditingAddr(a=>({...a,[key]:e.target.value}))}
                            onFocus={e=>(e.target.style.borderColor=BLUE)}
                            onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
                          <button onClick={()=>saveAddr(t.coin,t.network)}
                            disabled={savingAddr===key}
                            style={{padding:"9px 16px",borderRadius:9,border:"none",
                              background:NAVY,color:"#fff",fontWeight:700,
                              fontSize:12,cursor:"pointer",flexShrink:0,
                              opacity:savingAddr===key?.5:1}}>
                            {savingAddr===key?"…":"Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ):(
                <div style={{padding:"32px 24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>
                  Select a merchant to manage their deposit addresses
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: adjust + top wallets ── */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* Adjust wallet */}
          <div style={card}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",
              fontWeight:700,fontSize:14,color:NAVY}}>
              Adjust wallet
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={lbl}>Merchant</label>
                <select style={inp}
                  value={selWallet?.merchantId??""}
                  onChange={e=>{
                    const w=(wallets as any[]).find((w:any)=>w.merchantId===e.target.value);
                    setSelWallet(w??null);
                  }}>
                  <option value="">Choose a merchant…</option>
                  {(wallets as any[]).map((w:any)=>(
                    <option key={w.id} value={w.merchantId}>
                      {getMerchantName(w.merchantId)} — ${(w.usdEquivalent??0).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Credit/Debit toggle */}
              <div>
                <label style={lbl}>Type</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {(["credit","debit"] as const).map(t=>(
                    <button key={t} type="button" onClick={()=>setAdjType(t)}
                      style={{padding:"9px",borderRadius:9,cursor:"pointer",
                        fontWeight:700,fontSize:12,transition:"all .15s",
                        border:`1.5px solid ${adjType===t
                          ?t==="credit"?"rgba(22,163,74,.4)":"rgba(220,38,38,.4)"
                          :"#e5e7eb"}`,
                        background:adjType===t
                          ?t==="credit"?"rgba(22,163,74,.07)":"rgba(220,38,38,.07)"
                          :"#f8fafc",
                        color:adjType===t
                          ?t==="credit"?C.green:C.red
                          :"#64748b",
                        display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                      <Ico d={t==="credit"?I.down:I.up} s={12}/>
                      {t==="credit"?"Credit":"Debit"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <label style={lbl}>Coin</label>
                  <select style={inp} value={adjCoin} onChange={e=>setAdjCoin(e.target.value)}>
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Amount (USD)</label>
                  <input type="number" min={0} step="0.01" placeholder="0.00"
                    style={inp} value={adjAmount}
                    onChange={e=>setAdjAmount(e.target.value)}
                    onFocus={e=>(e.target.style.borderColor=BLUE)}
                    onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
                </div>
              </div>

              <div>
                <label style={lbl}>Reason</label>
                <input type="text" placeholder="e.g. Manual deposit credit"
                  style={inp} value={adjReason}
                  onChange={e=>setAdjReason(e.target.value)}
                  onFocus={e=>(e.target.style.borderColor=BLUE)}
                  onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              </div>

              <button onClick={handleAdjust} disabled={saving||!selWallet||!adjAmount||!adjReason}
                style={{padding:"11px",borderRadius:10,border:"none",cursor:"pointer",
                  fontWeight:700,fontSize:13,transition:"all .15s",
                  background:(saving||!selWallet||!adjAmount||!adjReason)
                    ?"rgba(15,23,42,.25)":adjType==="credit"?C.green:C.red,
                  color:"#fff",
                  opacity:(saving||!selWallet||!adjAmount||!adjReason)?.5:1}}>
                {saving?"Applying…":adjType==="credit"?"Credit Wallet":"Debit Wallet"}
              </button>
            </div>
          </div>

          {/* Top wallets leaderboard */}
          {topWallets.length>0&&(
            <div style={card}>
              <div style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",
                fontWeight:700,fontSize:14,color:NAVY}}>
                Top wallets
              </div>
              {topWallets.map((w:any,i:number)=>(
                <div key={w.id} style={{padding:"10px 16px",
                  borderBottom:i<topWallets.length-1?"1px solid #f8fafc":"none",
                  display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:18,fontSize:12,fontWeight:700,
                    color:i===0?"#d97706":i===1?"#94a3b8":i===2?"#b45309":"#94a3b8",
                    textAlign:"center",flexShrink:0}}>
                    {i+1}
                  </div>
                  <Avatar name={getMerchantName(w.merchantId)} size={30}/>
                  <div style={{flex:1,minWidth:0,fontSize:13,fontWeight:500,color:NAVY,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {getMerchantName(w.merchantId)}
                  </div>
                  <div style={{fontFamily:"monospace",fontWeight:700,fontSize:14,
                    color:NAVY,flexShrink:0}}>
                    ${(w.usdEquivalent??0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wallet-stats{grid-template-columns:repeat(4,1fr)}
        .wallet-cols{grid-template-columns:1.5fr 1fr}
        @media(max-width:768px){
          .wallet-stats{grid-template-columns:repeat(2,1fr)!important}
          .wallet-cols{grid-template-columns:1fr!important}
        }
      `}</style>
    </div>
  );
}
