// app/(admin)/transactions/page.tsx
"use client";
import { useState } from "react";
import { useTransactions } from "@/lib/hooks";

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444",btc:"#f7931a",eth:"#627eea",usdt:"#26a17b"};
const cIcon:Record<string,string>={BTC:"🟡",ETH:"🔷",USDT:"🟢"};
const cColor:Record<string,string>={BTC:"#f7931a",ETH:"#627eea",USDT:"#26a17b"};

export default function TransactionsPage(){
  const {data:txns=[],loading}=useTransactions();
  const [filter,setFilter]=useState("All");
  const filtered=filter==="All"?txns:filter==="deposit"||filter==="withdrawal"?txns.filter(t=>t.type===filter):txns.filter(t=>t.coin===filter);
  const totalIn=txns.filter(t=>t.type==="deposit"&&t.status==="confirmed").reduce((a,t)=>a+t.usdValue,0);
  const totalOut=txns.filter(t=>t.type==="withdrawal"&&t.status==="confirmed").reduce((a,t)=>a+t.usdValue,0);

  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:13};

  return(<div>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>Transactions</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>All crypto activity across the platform</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
      {[{l:"Total In",v:`$${totalIn.toFixed(0)}`,c:C.green},{l:"Total Out",v:`$${totalOut.toFixed(0)}`,c:C.blue},{l:"Confirmed",v:txns.filter(t=>t.status==="confirmed").length,c:C.green},{l:"Pending",v:txns.filter(t=>t.status==="pending").length,c:C.amber}].map((s,i)=>(
        <div key={s.l} className={`fu d${i+1}`} style={{...card,padding:14,textAlign:"center"}}>
          <div style={{fontWeight:800,fontSize:20,color:s.c}}>{s.v}</div>
          <div style={{fontSize:11,color:"#7b88aa",marginTop:2}}>{s.l}</div>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:14}}>
      {["BTC","ETH","USDT"].map((coin,i)=>{const total=txns.filter(t=>t.coin===coin).reduce((a,t)=>a+t.usdValue,0);return(
        <div key={coin} className={`fu d${i+1}`} style={{...card,padding:14,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>{cIcon[coin]}</span>
          <div><div style={{fontWeight:700,fontSize:13,color:cColor[coin]}}>{coin}</div>
          <div style={{fontWeight:800,fontSize:18}}>${total.toFixed(0)}</div>
          <div style={{fontSize:10,color:"#4e5875"}}>{txns.filter(t=>t.coin===coin).length} txns</div></div>
        </div>
      );})}
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["All","deposit","withdrawal","BTC","ETH","USDT"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",border:`1.5px solid ${filter===f?C.blue:"rgba(255,255,255,.08)"}`,background:filter===f?`${C.blue}18`:"transparent",color:filter===f?C.blue:"#7b88aa"}}>{f}</button>
      ))}
    </div>
    {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#4e5875"}}>Loading…</div>:filtered.length===0?<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:36,marginBottom:10}}>📊</div><div style={{fontWeight:700,fontSize:15,color:"#7b88aa"}}>No transactions</div></div>:(
      <div style={{display:"grid",gap:8}}>
        {filtered.map((tx,i)=>{const isIn=tx.type==="deposit";return(
          <div key={tx.id} className={`fu d${Math.min(i%6+1,6)}`} style={{...card,padding:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{width:38,height:38,borderRadius:10,flexShrink:0,background:isIn?"rgba(34,197,94,.1)":"rgba(220,38,38,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{isIn?"↓":"↑"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{tx.merchantName}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span>{cIcon[tx.coin]}</span><span style={{fontWeight:600,fontSize:12,color:cColor[tx.coin]}}>{tx.coin}</span>
                  <span style={{fontSize:11,color:"#7b88aa"}}>· {tx.network}</span>
                </div>
                <div style={{fontFamily:"monospace",fontSize:10,color:"#4e5875",marginTop:2}}>{tx.createdAt?.toDate?.().toLocaleDateString()} · {tx.txHash?.slice(0,14)}…</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:isIn?C.green:"#e2e8f8",marginBottom:4}}>{isIn?"+":"-"}${tx.usdValue.toFixed(2)}</div>
                <div style={{fontFamily:"monospace",fontSize:10,color:"#4e5875",marginBottom:4}}>{tx.amount} {tx.coin}</div>
                <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,textTransform:"uppercase",color:tx.status==="confirmed"?C.green:tx.status==="pending"?C.amber:C.red,background:tx.status==="confirmed"?"rgba(34,197,94,.12)":tx.status==="pending"?"rgba(245,158,11,.12)":"rgba(239,68,68,.12)"}}>{tx.status}</span>
              </div>
            </div>
          </div>
        );})}
      </div>
    )}
  </div>);
}
