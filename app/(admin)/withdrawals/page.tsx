// app/(admin)/withdrawals/page.tsx
"use client";
import { useState } from "react";
import { useAllWithdrawals, approveWithdrawal, rejectWithdrawal } from "@/lib/hooks";
import { auth } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444",btc:"#f7931a",eth:"#627eea",usdt:"#26a17b"};
const cIcon:Record<string,string>={BTC:"🟡",ETH:"🔷",USDT:"🟢"};
const cColor:Record<string,string>={BTC:C.btc,ETH:C.eth,USDT:C.usdt};

function Badge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string}>={pending:{c:C.amber,bg:"rgba(245,158,11,.12)"},approved:{c:C.green,bg:"rgba(34,197,94,.12)"},rejected:{c:C.red,bg:"rgba(239,68,68,.12)"},completed:{c:C.blue,bg:"rgba(220,38,38,.12)"}};
  const st=m[s]??{c:"#7b88aa",bg:"rgba(123,136,170,.12)"};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",color:st.c,background:st.bg}}>{s}</span>;
}

export default function WithdrawalsPage(){
  const [filter,setFilter]=useState("All");
  const {data:wds=[],loading}=useAllWithdrawals();
  const [acting,setActing]=useState<string|null>(null);
  const [rejReason,setRejReason]=useState("");
  const [rejTarget,setRejTarget]=useState<string|null>(null);
  const pending=wds.filter(w=>w.status==="pending");

  async function approve(id:string){
    setActing(id);
    try{await approveWithdrawal(id,auth.currentUser?.uid??"");toast.success("Withdrawal approved!");}
    catch{toast.error("Failed.");}
    setActing(null);
  }
  async function reject(id:string){
    if(!rejReason.trim()){toast.error("Enter rejection reason.");return;}
    setActing(id);
    try{await rejectWithdrawal(id,auth.currentUser?.uid??"",rejReason);toast.success("Rejected.");setRejTarget(null);setRejReason("");}
    catch{toast.error("Failed.");}
    setActing(null);
  }

  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14};

  return(<div>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>Withdrawals</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>{pending.length} pending review</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:16}}>
      {[{l:"Pending",v:wds.filter(w=>w.status==="pending").length,c:C.amber},{l:"Approved",v:wds.filter(w=>w.status==="approved").length,c:C.green},{l:"Rejected",v:wds.filter(w=>w.status==="rejected").length,c:C.red},{l:"Total USD",v:`$${wds.reduce((a,w)=>a+w.usdValue,0).toFixed(0)}`,c:C.blue}].map((s,i)=>(
        <div key={s.l} className={`fu d${i+1}`} style={{...card,padding:14,textAlign:"center"}}>
          <div style={{fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
          <div style={{fontSize:11,color:"#7b88aa",marginTop:2}}>{s.l}</div>
        </div>
      ))}
    </div>
    {pending.length>0&&<div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontWeight:700,color:C.amber,fontSize:13}}>⏳ {pending.length} withdrawal{pending.length>1?"s":""} · ${pending.reduce((a,w)=>a+w.usdValue,0).toFixed(2)} USD pending</div>
      <button onClick={()=>setFilter("pending")} style={{background:C.amber,color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Review</button>
    </div>}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["All","pending","approved","rejected","completed"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 16px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",border:`1.5px solid ${filter===f?C.blue:"rgba(255,255,255,.08)"}`,background:filter===f?`${C.blue}18`:"transparent",color:filter===f?C.blue:"#7b88aa"}}>{f}</button>
      ))}
    </div>
    {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#4e5875"}}>Loading…</div>:wds.length===0?<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>💸</div><div style={{fontWeight:700,fontSize:15,color:"#7b88aa"}}>No withdrawals</div></div>:(
      <div style={{display:"grid",gap:12}}>
        {wds.map((w,i)=>(
          <div key={w.id} className={`fu d${Math.min(i%5+1,5)}`} style={{...card,overflow:"hidden",border:w.status==="pending"?"1px solid rgba(245,158,11,.3)":"1px solid rgba(255,255,255,.08)"}}>
            <div style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
                <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontWeight:700,fontSize:15}}>{w.merchantName}</span><Badge s={w.status}/></div>
                <div style={{fontFamily:"monospace",fontSize:10,color:"#4e5875"}}>{w.id?.slice(0,14)}… · {w.requestedAt?.toDate?.().toLocaleDateString()}</div></div>
                <div style={{textAlign:"right"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2,justifyContent:"flex-end"}}><span>{cIcon[w.coin]}</span><span style={{fontFamily:"monospace",fontWeight:800,fontSize:18,color:cColor[w.coin]}}>{w.amount} {w.coin}</span></div>
                <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.green}}>${w.usdValue.toFixed(2)}</div></div>
              </div>
              <div style={{background:"#161e30",borderRadius:10,padding:"12px 14px",marginBottom:w.status==="pending"?12:0}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:6}}>
                  <div><div style={{fontSize:10,color:"#4e5875",marginBottom:2}}>NETWORK</div><div style={{fontSize:12,fontWeight:600}}>{w.network}</div></div>
                  <div><div style={{fontSize:10,color:"#4e5875",marginBottom:2}}>COIN</div><div style={{fontSize:12,fontWeight:600,color:cColor[w.coin]}}>{w.coin}</div></div>
                </div>
                <div><div style={{fontSize:10,color:"#4e5875",marginBottom:3}}>DESTINATION</div><div style={{fontFamily:"monospace",fontSize:11,color:"#38bdf8",wordBreak:"break-all"}}>{w.destinationAddress}</div></div>
                {w.rejectionReason&&<div style={{marginTop:8,padding:"7px 10px",background:"rgba(239,68,68,.08)",borderRadius:8,fontSize:12,color:C.red}}>Reason: {w.rejectionReason}</div>}
              </div>
              {w.status==="pending"&&(rejTarget===w.id?
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input value={rejReason} onChange={e=>setRejReason(e.target.value)} placeholder="Rejection reason…" style={{flex:1,minWidth:160,background:"#161e30",border:"1.5px solid rgba(239,68,68,.4)",borderRadius:9,padding:"8px 12px",color:"#e2e8f8",fontSize:13,outline:"none"}}/>
                  <button onClick={()=>reject(w.id!)} disabled={acting===w.id} style={{padding:"8px 16px",borderRadius:9,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.1)",color:C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>{acting===w.id?"…":"Confirm"}</button>
                  <button onClick={()=>setRejTarget(null)} style={{padding:"8px 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#7b88aa",fontSize:12,cursor:"pointer"}}>Cancel</button>
                </div>:
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>approve(w.id!)} disabled={acting===w.id} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(34,197,94,.3)",background:"rgba(34,197,94,.1)",color:C.green,fontWeight:700,fontSize:14,cursor:"pointer",opacity:acting===w.id?.5:1}}>{acting===w.id?"Processing…":"✓ Approve"}</button>
                  <button onClick={()=>setRejTarget(w.id!)} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.1)",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>✕ Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>);
}
