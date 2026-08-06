// app/(admin)/merchants/page.tsx
"use client";
import { useState } from "react";
import { useAllStores, useAllWallets, blockStore, unblockStore } from "@/lib/hooks";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
import type { Store } from "@/lib/types";
import toast from "react-hot-toast";
import StoreControls from "@/components/StoreControls";

const C = { blue:"#dc2626", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  violet:"#a78bfa", sky:"#38bdf8" };

function Badge({ s }: { s:string }) {
  const m: Record<string,{c:string,bg:string}> = {
    active:   {c:C.green, bg:"rgba(34,197,94,.12)"},
    pending:  {c:C.amber, bg:"rgba(245,158,11,.12)"},
    suspended:{c:"#7b88aa",bg:"rgba(123,136,170,.12)"},
    blocked:  {c:C.red,   bg:"rgba(239,68,68,.12)"},
    gold:     {c:"#dc2626",bg:"rgba(220,38,38,.14)"},
    silver:   {c:C.sky,   bg:"rgba(56,189,248,.12)"},
    starter:  {c:"#7b88aa",bg:"rgba(123,136,170,.12)"},
    pro:      {c:"#dc2626",bg:"rgba(220,38,38,.14)"},   // legacy
    growth:   {c:C.sky,   bg:"rgba(56,189,248,.12)"},    // legacy
  };
  const st = m[s] ?? {c:"#7b88aa",bg:"rgba(123,136,170,.12)"};
  return <span style={{ fontFamily:"monospace",fontSize:10,fontWeight:600,
    padding:"3px 9px",borderRadius:99,textTransform:"uppercase",
    color:st.c,background:st.bg }}>{s}</span>;
}

async function updateStoreField(storeId:string, data:Record<string,any>) {
  await updateDoc(doc(getFirestore(), "stores", storeId), data);
}

export default function MerchantsPage() {
  const { data:stores = [], loading } = useAllStores();
  const { data:wallets = [] }         = useAllWallets();
  const [filter, setFilter]           = useState("All");
  const [expanded, setExpanded]       = useState<string|null>(null);
  const [editMargin, setEditMargin]   = useState<Record<string,string>>({});
  const [editMax, setEditMax]         = useState<Record<string,string>>({});

  const filtered = filter==="All" ? stores
    : stores.filter(s => s.status === filter.toLowerCase());

  async function handleStatus(s:Store, next:string, reason?:string) {
    try {
      if (next === "blocked") {
        await blockStore(s.id!, reason ?? "Admin manual block.");
      } else if (next === "active") {
        await unblockStore(s.id!);
      } else {
        await updateStoreField(s.id!, { status: next });
      }
      toast.success(`Store ${next}.`);
    } catch { toast.error("Failed to update status."); }
  }

  const card: React.CSSProperties = { background:"#101624",
    border:"1px solid rgba(255,255,255,.08)", borderRadius:14 };

  return (
    <div>
      <div className="fu" style={{ marginBottom:22 }}>
        <h1 style={{ fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3 }}>Merchants</h1>
        <p style={{ color:"#7b88aa",fontSize:13 }}>{stores.length} registered stores</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",
        gap:10,marginBottom:18 }}>
        {[{l:"Total",f:"All",c:C.blue},{l:"Active",f:"active",c:C.green},
          {l:"Pending",f:"pending",c:C.amber},{l:"Blocked",f:"blocked",c:C.red},
          {l:"Suspended",f:"suspended",c:"#7b88aa"}].map((s,i)=>(
          <div key={s.l} className={`fu d${i+1}`}
            style={{ ...card,padding:14,textAlign:"center",cursor:"pointer" }}
            onClick={()=>setFilter(s.f)}>
            <div style={{ fontWeight:800,fontSize:22,
              color:filter===s.f?s.c:"#e2e8f8" }}>
              {s.f==="All" ? stores.length : stores.filter(x=>x.status===s.f).length}
            </div>
            <div style={{ fontSize:11,color:"#7b88aa",marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:14 }}>
        {["All","active","pending","blocked","suspended"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"6px 16px",borderRadius:99,fontSize:12,fontWeight:600,
            cursor:"pointer",textTransform:"capitalize",
            border:`1.5px solid ${filter===f?C.blue:"rgba(255,255,255,.08)"}`,
            background:filter===f?`${C.blue}18`:"transparent",
            color:filter===f?C.blue:"#7b88aa" }}>{f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center",padding:"40px 0",color:"#4e5875" }}>Loading…</div>
      ) : filtered.length===0 ? (
        <div style={{ ...card,padding:48,textAlign:"center" }}>
          <div style={{ fontSize:40,marginBottom:12 }}>🏪</div>
          <div style={{ fontWeight:700,fontSize:16,color:"#e2e8f8" }}>No merchants found</div>
        </div>
      ) : (
        <div style={{ display:"grid",gap:12 }}>
          {filtered.map((s,i)=>{
            const wallet = wallets.find((w:any)=>w.storeId===s.id);
            const isOpen = expanded===s.id;
            const rating = s.rating ?? 0;
            return (
              <div key={s.id} className={`fu d${Math.min(i%5+1,5)}`}
                style={{ ...card,overflow:"hidden",
                  border:s.status==="blocked"
                    ?"1px solid rgba(239,68,68,.3)"
                    :s.status==="pending"
                    ?"1px solid rgba(245,158,11,.25)"
                    :"1px solid rgba(255,255,255,.08)" }}>

                {/* Header */}
                <div style={{ padding:18,cursor:"pointer" }}
                  onClick={()=>setExpanded(isOpen?null:s.id!)}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                    <div style={{ width:44,height:44,borderRadius:11,flexShrink:0,
                      background:`${C.blue}20`,color:C.blue,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontFamily:"monospace",fontSize:13,fontWeight:700 }}>
                      {(s.storeName??'??').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3 }}>
                        <span style={{ fontWeight:700,fontSize:15 }}>{s.storeName}</span>
                        <Badge s={s.status}/><Badge s={s.plan}/>
                      </div>
                      <div style={{ fontSize:12,color:"#7b88aa",overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {s.domain} · {s.country}
                      </div>
                    </div>
                    {/* Rating */}
                    <div style={{ textAlign:"center",flexShrink:0 }}>
                      <div style={{ fontSize:16,color:C.amber }}>
                        {"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}
                      </div>
                      <div style={{ fontSize:10,color:"#7b88aa" }}>{rating.toFixed(1)} / 5.0</div>
                    </div>
                    {/* Wallet */}
                    <div style={{ background:"#161e30",borderRadius:10,
                      padding:"8px 14px",textAlign:"center",flexShrink:0 }}>
                      <div style={{ fontSize:10,color:"#4e5875",marginBottom:1 }}>WALLET</div>
                      <div style={{ fontFamily:"monospace",fontWeight:800,fontSize:16,color:C.green }}>
                        ${(wallet?.usdEquivalent??0).toFixed(2)}
                      </div>
                    </div>
                    <span style={{ color:"#4e5875",fontSize:14 }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen&&(
                  <div style={{ borderTop:"1px solid rgba(255,255,255,.06)",padding:18 }}>
                    {/* Stats */}
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
                      gap:10,marginBottom:16 }}>
                      {[
                        {l:"Commission",v:`${((s.commissionRate??0.03)*100).toFixed(0)}%`,c:C.blue},
                        {l:"Margin",    v:`${((s.merchantMargin??0.20)*100).toFixed(0)}%`,c:C.green},
                        {l:"Max Products",v:(s.maxProducts??350).toLocaleString(),         c:C.violet},
                        {l:"Total Orders",v:s.totalOrders??0,                              c:C.amber},
                        {l:"On-Time",  v:`${s.onTimeOrders??0}/${s.totalOrders??0}`,      c:C.sky},
                        {l:"Rating",   v:s.rating ? `★ ${Number(s.rating).toFixed(1)}` : "—", c:"#dc2626"},
                      ].map(st=>(
                        <div key={st.l} style={{ background:"#1c2640",borderRadius:10,
                          padding:"10px 14px",textAlign:"center" }}>
                          <div style={{ fontWeight:800,fontSize:18,color:st.c }}>{st.v}</div>
                          <div style={{ fontSize:10,color:"#7b88aa",marginTop:2 }}>{st.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Blocked reason */}
                    {s.status==="blocked"&&s.blockedReason&&(
                      <div style={{ background:"rgba(239,68,68,.08)",
                        border:"1px solid rgba(239,68,68,.2)",borderRadius:10,
                        padding:"10px 14px",marginBottom:14,fontSize:13,color:C.red }}>
                        🚫 Blocked: {s.blockedReason}
                      </div>
                    )}

                    {/* Rating + Plan controls */}
                    <div style={{ marginBottom:14 }}>
                      <StoreControls store={s} onDone={()=>{}}/>
                    </div>

                    {/* Admin controls */}
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                      gap:12,marginBottom:14 }}>
                      {/* Sales Target */}
                      <div>
                        <label style={{ fontSize:11,fontWeight:700,color:"#7b88aa",
                          display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px" }}>
                          Sales Target ($)
                        </label>
                        <div style={{ display:"flex",gap:6 }}>
                          <input type="number" placeholder="10000"
                            defaultValue={s.settings?.salesTarget??10000}
                            id={`target_${s.id}`}
                            style={{ flex:1,background:"#161e30",border:"1px solid rgba(255,255,255,.1)",
                              borderRadius:9,padding:"8px 10px",color:"#e2e8f8",fontSize:13,outline:"none" }}/>
                          <button onClick={async()=>{
                            const el=document.getElementById(`target_${s.id}`) as HTMLInputElement;
                            if(el){
                              await updateStoreField(s.id!,{"settings.salesTarget":parseFloat(el.value)});
                              toast.success("Sales target updated.");
                            }
                          }} style={{ padding:"8px 14px",borderRadius:9,border:"none",
                            background:C.blue,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                            Save
                          </button>
                        </div>
                      </div>
                      {/* Merchant Margin */}
                      <div>
                        <label style={{ fontSize:11,fontWeight:700,color:"#7b88aa",
                          display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px" }}>
                          Merchant Margin %
                        </label>
                        <div style={{ display:"flex",gap:6 }}>
                          <input type="number" min="5" max="60"
                            value={editMargin[s.id!]??((s.merchantMargin??0.20)*100).toFixed(0)}
                            onChange={e=>setEditMargin(m=>({...m,[s.id!]:e.target.value}))}
                            style={{ flex:1,background:"#161e30",
                              border:"1px solid rgba(255,255,255,.1)",borderRadius:9,
                              padding:"8px 10px",color:"#e2e8f8",fontSize:13,outline:"none" }}/>
                          <button onClick={async()=>{
                            const val=parseFloat(editMargin[s.id!]??20)/100;
                            await updateStoreField(s.id!,{merchantMargin:val});
                            toast.success("Margin updated.");
                          }} style={{ padding:"8px 14px",borderRadius:9,border:"none",
                            background:C.blue,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                            Save
                          </button>
                        </div>
                      </div>
                      {/* Max Products */}
                      <div>
                        <label style={{ fontSize:11,fontWeight:700,color:"#7b88aa",
                          display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px" }}>
                          Max Products
                        </label>
                        <div style={{ display:"flex",gap:6 }}>
                          <input type="number" min="1" max="999"
                            value={editMax[s.id!]??(s.maxProducts??10)}
                            onChange={e=>setEditMax(m=>({...m,[s.id!]:e.target.value}))}
                            style={{ flex:1,background:"#161e30",
                              border:"1px solid rgba(255,255,255,.1)",borderRadius:9,
                              padding:"8px 10px",color:"#e2e8f8",fontSize:13,outline:"none" }}/>
                          <button onClick={async()=>{
                            const val=parseInt(editMax[s.id!]??10);
                            await updateStoreField(s.id!,{maxProducts:val});
                            toast.success("Limit updated.");
                          }} style={{ padding:"8px 14px",borderRadius:9,border:"none",
                            background:C.blue,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                            Save
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      {s.status==="pending"&&(
                        <button onClick={()=>handleStatus(s,"active")}
                          style={{ padding:"8px 18px",borderRadius:9,
                            border:"1px solid rgba(34,197,94,.3)",
                            background:"rgba(34,197,94,.1)",color:C.green,
                            fontWeight:700,fontSize:13,cursor:"pointer" }}>
                          ✓ Approve Store
                        </button>
                      )}
                      {s.status==="active"&&(
                        <button onClick={()=>handleStatus(s,"suspended")}
                          style={{ padding:"8px 18px",borderRadius:9,
                            border:"1px solid rgba(123,136,170,.3)",
                            background:"rgba(123,136,170,.08)",color:"#7b88aa",
                            fontWeight:700,fontSize:13,cursor:"pointer" }}>
                          Suspend
                        </button>
                      )}
                      {(s.status==="suspended"||s.status==="blocked")&&(
                        <button onClick={()=>handleStatus(s,"active")}
                          style={{ padding:"8px 18px",borderRadius:9,
                            border:"1px solid rgba(34,197,94,.3)",
                            background:"rgba(34,197,94,.1)",color:C.green,
                            fontWeight:700,fontSize:13,cursor:"pointer" }}>
                          ✓ Unblock / Reactivate
                        </button>
                      )}
                      {s.status==="active"&&(
                        <button onClick={()=>handleStatus(s,"blocked","Admin manual block.")}
                          style={{ padding:"8px 18px",borderRadius:9,
                            border:"1px solid rgba(239,68,68,.3)",
                            background:"rgba(239,68,68,.1)",color:C.red,
                            fontWeight:700,fontSize:13,cursor:"pointer" }}>
                          🚫 Block Store
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
