// app/(admin)/stores/page.tsx
// Admin: view all merchant stores + manage their products
"use client";
import { useState } from "react";
import { deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  useAllStores, useAdminStoreProducts,
  blockStore, unblockStore, updateStorePlan,
} from "@/lib/hooks";
import toast from "react-hot-toast";

// ── Tokens ────────────────────────────────────────────────────
const NAVY = "#0f172a";
const BLUE = "#dc2626";
const C    = { green:"#16a34a", red:"#dc2626", amber:"#d97706" };

// ── SVG ───────────────────────────────────────────────────────
const Ico = ({ d, s=14, c="currentColor" }:{ d:string|string[]; s?:number; c?:string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {(Array.isArray(d)?d:[d]).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);
const I = {
  search: ["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"],
  pkg:    ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z","M3.27 6.96L12 12.01l8.73-5.05","M12 22.08V12"],
  trash:  ["M3 6h18","M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6","M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"],
  eye:    ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  eyeOff: ["M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94","M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19","M1 1l22 22"],
  chevR:  "M9 18l6-6-6-6",
  back:   "M19 12H5M12 19l-7-7 7-7",
  check:  "M20 6L9 17l-5-5",
  block:  ["M12 22a10 10 0 100-20 10 10 0 000 20z","M4.93 4.93l14.14 14.14"],
  x:      "M18 6L6 18M6 6l12 12",
};

// ── Status + plan config ──────────────────────────────────────
const STATUS:Record<string,{color:string,bg:string}> = {
  active:  {color:C.green, bg:"rgba(22,163,74,.08)"},
  pending: {color:C.amber, bg:"rgba(217,119,6,.08)"},
  blocked: {color:C.red,   bg:"rgba(220,38,38,.08)"},
};
const PLAN:Record<string,{color:string,bg:string}> = {
  starter: {color:"#6b7280", bg:"rgba(107,114,128,.1)"},
  growth:  {color:BLUE,      bg:"rgba(220,38,38,.1)"},
  pro:     {color:"#7c3aed", bg:"rgba(124,58,237,.1)"},
};

// ── Pill ─────────────────────────────────────────────────────
function Pill({ label, color, bg }:{ label:string; color:string; bg:string }) {
  return (
    <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:99,
      textTransform:"capitalize",color,background:bg,
      border:`1px solid ${color}25`,whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}

// ── Confirm remove modal ──────────────────────────────────────
function ConfirmRemove({ product, storeName, onConfirm, onCancel, removing }:{
  product:any; storeName:string;
  onConfirm:()=>void; onCancel:()=>void; removing:boolean;
}) {
  return (
    <>
      <div onClick={onCancel}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
          zIndex:300,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",zIndex:301,
        transform:"translate(-50%,-50%)",
        width:"min(400px,92vw)",background:"#fff",
        borderRadius:16,overflow:"hidden",
        boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{height:3,background:C.red}}/>
        <div style={{padding:24}}>
          <div style={{width:44,height:44,borderRadius:12,
            background:"rgba(220,38,38,.08)",
            display:"flex",alignItems:"center",justifyContent:"center",
            marginBottom:14,color:C.red}}>
            <Ico d={I.trash} s={20}/>
          </div>
          <div style={{fontWeight:800,fontSize:17,color:NAVY,marginBottom:8}}>
            Remove product?
          </div>
          <p style={{fontSize:13,color:"#64748b",lineHeight:1.65,marginBottom:20}}>
            <strong style={{color:NAVY}}>{product.productName}</strong> will be removed
            from <strong style={{color:NAVY}}>{storeName}</strong>. The merchant can re-add
            it from the catalog.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={onCancel}
              style={{padding:"11px",borderRadius:10,border:"1.5px solid #e5e7eb",
                background:"transparent",color:"#64748b",fontWeight:600,
                fontSize:13,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={removing}
              style={{padding:"11px",borderRadius:10,border:"none",
                background:C.red,color:"#fff",fontWeight:700,
                fontSize:13,cursor:"pointer",opacity:removing?.6:1}}>
              {removing?"Removing…":"Yes, remove"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Store products panel ──────────────────────────────────────
function StoreProductsPanel({ store, onClose }:{
  store:any; onClose:()=>void;
}) {
  const { items, loading } = useAdminStoreProducts(store.id);
  const [search,    setSearch]    = useState("");
  const [toRemove,  setToRemove]  = useState<any|null>(null);
  const [removing,  setRemoving]  = useState(false);
  const [toggling,  setToggling]  = useState<string|null>(null);

  const filtered = items.filter((p:any)=>
    !search || p.productName?.toLowerCase().includes(search.toLowerCase())
  );

  const visible  = items.filter((p:any)=>p.isVisible).length;
  const hidden   = items.filter((p:any)=>!p.isVisible).length;

  async function doRemove() {
    if (!toRemove) return;
    setRemoving(true);
    try {
      await deleteDoc(doc(db,"store_products",toRemove.id));
      toast.success(`Removed "${toRemove.productName}"`);
      setToRemove(null);
    } catch { toast.error("Failed to remove."); }
    setRemoving(false);
  }

  async function toggleVisibility(item:any) {
    setToggling(item.id);
    try {
      await updateDoc(doc(db,"store_products",item.id),{
        isVisible: !item.isVisible,
        updatedAt: serverTimestamp(),
      });
      toast.success(item.isVisible?"Product hidden from store":"Product now visible");
    } catch { toast.error("Failed."); }
    setToggling(null);
  }

  return (
    <>
      {toRemove&&(
        <ConfirmRemove
          product={toRemove}
          storeName={store.storeName}
          onConfirm={doRemove}
          onCancel={()=>setToRemove(null)}
          removing={removing}/>
      )}

      <div style={{
        background:"#fff",border:"1px solid #e5e9f5",
        borderRadius:16,overflow:"hidden",
        boxShadow:"0 4px 20px rgba(0,0,0,.07)"}}>

        {/* Panel header */}
        <div style={{background:NAVY,padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <button onClick={onClose}
              style={{width:32,height:32,borderRadius:8,flexShrink:0,
                border:"1px solid rgba(255,255,255,.2)",
                background:"rgba(255,255,255,.1)",cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
              <Ico d={I.back} s={15}/>
            </button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:16,color:"#fff",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {store.storeName}
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:1}}>
                {store.merchantName} · {store.country}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <Pill label={store.status??"pending"}
                {...(STATUS[store.status]??STATUS.pending)}/>
              <Pill label={store.plan??"starter"}
                {...(PLAN[store.plan]??PLAN.starter)}/>
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[
              {l:"Total",   v:items.length,  c:"rgba(255,255,255,.9)"},
              {l:"Visible", v:visible,       c:"#4ade80"},
              {l:"Hidden",  v:hidden,        c:"rgba(255,255,255,.4)"},
            ].map(s=>(
              <div key={s.l} style={{background:"rgba(255,255,255,.07)",
                borderRadius:10,padding:"10px 12px",textAlign:"center",
                border:"1px solid rgba(255,255,255,.1)"}}>
                <div style={{fontWeight:800,fontSize:18,color:s.c,
                  fontFamily:"monospace"}}>{s.v}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.4)",
                  marginTop:2,fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{padding:"12px 14px",borderBottom:"1px solid #f1f5f9",
          position:"relative"}}>
          <div style={{position:"absolute",left:26,top:"50%",
            transform:"translateY(-50%)",pointerEvents:"none",color:"#94a3b8"}}>
            <Ico d={I.search} s={14}/>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search products in this store…"
            style={{width:"100%",padding:"8px 12px 8px 34px",
              boxSizing:"border-box",border:"1.5px solid #e5e7eb",
              borderRadius:9,fontSize:13,outline:"none",color:NAVY,
              transition:"border .15s"}}
            onFocus={e=>(e.target.style.borderColor=BLUE)}
            onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
        </div>

        {/* Products list */}
        <div style={{maxHeight:480,overflowY:"auto"}}>
          {loading?(
            <div style={{padding:"48px 24px",textAlign:"center",color:"#94a3b8",fontSize:13}}>
              Loading products…
            </div>
          ):items.length===0?(
            <div style={{padding:"48px 24px",textAlign:"center"}}>
              <div style={{width:52,height:52,borderRadius:14,
                background:"rgba(15,23,42,.05)",
                display:"flex",alignItems:"center",justifyContent:"center",
                margin:"0 auto 12px"}}>
                <Ico d={I.pkg} s={24} c="#94a3b8"/>
              </div>
              <div style={{fontWeight:600,fontSize:14,color:NAVY,marginBottom:4}}>
                No products in this store
              </div>
              <div style={{fontSize:12,color:"#94a3b8"}}>
                Merchant hasn't added any products yet
              </div>
            </div>
          ):filtered.length===0?(
            <div style={{padding:"32px 24px",textAlign:"center",
              fontSize:13,color:"#94a3b8"}}>
              No products match "{search}"
            </div>
          ):filtered.map((item:any,i:number)=>(
            <div key={item.id}
              style={{display:"flex",alignItems:"center",gap:12,
                padding:"12px 16px",
                borderBottom:i<filtered.length-1?"1px solid #f8fafc":"none",
                transition:"background .1s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#fafafa")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>

              {/* Thumbnail */}
              <div style={{width:46,height:46,borderRadius:10,flexShrink:0,
                overflow:"hidden",border:"1px solid #e5e7eb",
                background:"#f1f5f9",display:"flex",
                alignItems:"center",justifyContent:"center"}}>
                {item.productImage?.startsWith("http")
                  ?<img src={item.productImage} alt="" loading="lazy"
                     style={{width:"100%",height:"100%",objectFit:"cover"}}
                     onError={e=>((e.currentTarget as any).style.display="none")}/>
                  :<Ico d={I.pkg} s={18} c="#cbd5e1"/>}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:NAVY,
                  overflow:"hidden",textOverflow:"ellipsis",
                  whiteSpace:"nowrap",marginBottom:4}}>
                  {item.productName}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"monospace",fontSize:12,
                    fontWeight:700,color:NAVY}}>
                    ${(item.retailPrice??0).toFixed(2)}
                  </span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>
                    cost ${(item.basePrice??0).toFixed(2)}
                  </span>
                  {/* Visibility badge */}
                  <span style={{display:"inline-flex",alignItems:"center",gap:3,
                    fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:99,
                    color:item.isVisible?C.green:"#94a3b8",
                    background:item.isVisible?"rgba(22,163,74,.07)":"rgba(148,163,184,.07)",
                    border:`1px solid ${item.isVisible?"rgba(22,163,74,.2)":"#e5e7eb"}`}}>
                    <Ico d={item.isVisible?I.eye:I.eyeOff} s={9}
                      c={item.isVisible?C.green:"#94a3b8"}/>
                    {item.isVisible?"Visible":"Hidden"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                {/* Toggle visibility */}
                <button
                  onClick={()=>toggleVisibility(item)}
                  disabled={toggling===item.id}
                  title={item.isVisible?"Hide from store":"Show in store"}
                  style={{width:34,height:34,borderRadius:9,cursor:"pointer",
                    border:`1px solid ${item.isVisible?"rgba(220,38,38,.2)":"#e5e7eb"}`,
                    background:item.isVisible?"rgba(220,38,38,.06)":"#f8fafc",
                    color:item.isVisible?BLUE:"#94a3b8",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all .15s",opacity:toggling===item.id?.5:1}}>
                  <Ico d={item.isVisible?I.eye:I.eyeOff} s={14}
                    c={item.isVisible?BLUE:"#94a3b8"}/>
                </button>

                {/* Remove */}
                <button
                  onClick={()=>setToRemove(item)}
                  title="Remove from store"
                  style={{width:34,height:34,borderRadius:9,cursor:"pointer",
                    border:"1px solid rgba(220,38,38,.2)",
                    background:"rgba(220,38,38,.06)",
                    color:C.red,display:"flex",
                    alignItems:"center",justifyContent:"center",
                    transition:"all .15s"}}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background="rgba(220,38,38,.12)";}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(220,38,38,.06)";}}>
                  <Ico d={I.trash} s={14} c={C.red}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {filtered.length>0&&(
          <div style={{padding:"10px 16px",borderTop:"1px solid #f1f5f9",
            background:"#fafafa",display:"flex",
            justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:"#94a3b8"}}>
              {filtered.length} product{filtered.length!==1?"s":""}
            </span>
            <span style={{fontSize:11,color:"#94a3b8"}}>
              👁 toggle visibility · 🗑 remove
            </span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminStoresPage() {
  const { data: stores=[], loading } = useAllStores();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<"all"|"active"|"pending"|"blocked">("all");
  const [selected, setSelected] = useState<any|null>(null);
  const [acting,   setActing]   = useState<string|null>(null);

  const filtered = stores.filter((s:any)=>{
    const ms = !search ||
      s.storeName?.toLowerCase().includes(search.toLowerCase())||
      s.merchantName?.toLowerCase().includes(search.toLowerCase());
    const mf = filter==="all"||s.status===filter;
    return ms&&mf;
  });

  const counts = {
    all:     stores.length,
    active:  stores.filter((s:any)=>s.status==="active").length,
    pending: stores.filter((s:any)=>s.status==="pending").length,
    blocked: stores.filter((s:any)=>s.status==="blocked").length,
  };

  async function toggleBlock(store:any) {
    setActing(store.id);
    try {
      if (store.status==="blocked") {
        await unblockStore(store.id);
        toast.success(`${store.storeName} unblocked`);
      } else {
        await blockStore(store.id,"Blocked by admin");
        toast.success(`${store.storeName} blocked`);
      }
    } catch { toast.error("Failed."); }
    setActing(null);
  }

  async function changePlan(store:any, plan:string) {
    setActing(store.id);
    try {
      await updateStorePlan(store.id, plan);
      toast.success(`${store.storeName} → ${plan} plan`);
    } catch { toast.error("Failed."); }
    setActing(null);
  }

  const card:React.CSSProperties = {
    background:"#fff", border:"1px solid #e5e9f5",
    borderRadius:14, overflow:"hidden",
    transition:"box-shadow .2s ease",
  };

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontWeight:900,fontSize:22,color:NAVY,
          letterSpacing:"-.5px",marginBottom:3}}>Stores</h1>
        <p style={{fontSize:13,color:"#64748b"}}>
          {stores.length} merchant store{stores.length!==1?"s":""}
        </p>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",
        gap:10,marginBottom:20}} className="stores-stats">
        {[
          {l:"Total",   v:counts.all,     c:NAVY,    bg:"rgba(15,23,42,.06)", bd:"rgba(15,23,42,.12)"},
          {l:"Active",  v:counts.active,  c:C.green, bg:"rgba(22,163,74,.06)",bd:"rgba(22,163,74,.18)"},
          {l:"Pending", v:counts.pending, c:C.amber, bg:"rgba(217,119,6,.06)",bd:"rgba(217,119,6,.18)"},
          {l:"Blocked", v:counts.blocked, c:C.red,   bg:"rgba(220,38,38,.06)",bd:"rgba(220,38,38,.18)"},
        ].map(s=>(
          <div key={s.l} style={{background:s.bg,border:`1px solid ${s.bd}`,
            borderRadius:12,padding:"14px 16px",textAlign:"center",
            cursor:s.l.toLowerCase()!=="total"?"pointer":"default"}}>
            <div style={{fontWeight:900,fontSize:22,color:s.c,
              fontFamily:"monospace",marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:500}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{display:"grid",gap:16,
        gridTemplateColumns:selected?"1fr 1fr":"1fr"}}
        className="stores-layout">

        {/* Left: store list */}
        <div>
          {/* Search + filter */}
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <div style={{flex:"1 1 200px",position:"relative"}}>
              <div style={{position:"absolute",left:11,top:"50%",
                transform:"translateY(-50%)",color:"#94a3b8",pointerEvents:"none"}}>
                <Ico d={I.search} s={14}/>
              </div>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search store or merchant…"
                style={{width:"100%",padding:"9px 12px 9px 33px",
                  boxSizing:"border-box",border:"1.5px solid #e5e7eb",
                  borderRadius:10,fontSize:13,outline:"none",color:NAVY,
                  transition:"border .15s"}}
                onFocus={e=>(e.target.style.borderColor=BLUE)}
                onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
            </div>
            <div style={{display:"flex",gap:5}}>
              {(["all","active","pending","blocked"] as const).map(f=>(
                <button key={f} onClick={()=>setFilter(f)}
                  style={{padding:"8px 13px",borderRadius:99,cursor:"pointer",
                    fontSize:11,fontWeight:filter===f?700:500,
                    border:`1.5px solid ${filter===f?NAVY:"#e5e7eb"}`,
                    background:filter===f?NAVY:"#fff",
                    color:filter===f?"#fff":"#64748b",
                    textTransform:"capitalize",transition:"all .15s"}}>
                  {f}
                  <span style={{marginLeft:4,fontFamily:"monospace",fontSize:10,
                    color:filter===f?"rgba(255,255,255,.5)":"#94a3b8"}}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Stores */}
          {loading?(
            <div style={{display:"grid",gap:10}}>
              {[...Array(3)].map((_,i)=>(
                <div key={i} style={{...card,padding:16,
                  display:"flex",gap:12,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:11,
                    background:"#f1f5f9",flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{height:14,background:"#f1f5f9",
                      borderRadius:6,width:"40%",marginBottom:8}}/>
                    <div style={{height:11,background:"#f1f5f9",
                      borderRadius:6,width:"60%"}}/>
                  </div>
                </div>
              ))}
            </div>
          ):filtered.length===0?(
            <div style={{...card,padding:"40px 24px",textAlign:"center"}}>
              <div style={{fontWeight:600,fontSize:14,color:NAVY,marginBottom:4}}>
                No stores found
              </div>
              <div style={{fontSize:12,color:"#94a3b8"}}>
                {search?"Try a different search":"No stores yet"}
              </div>
            </div>
          ):(
            <div style={{display:"grid",gap:8}}>
              {filtered.map((store:any)=>{
                const isSelected = selected?.id===store.id;
                const st = STATUS[store.status] ?? STATUS.pending;
                return (
                  <div key={store.id}
                    style={{...card,
                      border:isSelected
                        ?`2px solid ${BLUE}`
                        :"1px solid #e5e9f5",
                      boxShadow:isSelected?"0 2px 12px rgba(220,38,38,.12)":"none"}}>

                    {/* Status line */}
                    <div style={{height:3,background:
                      store.status==="active"?C.green:
                      store.status==="blocked"?C.red:C.amber}}/>

                    <div style={{padding:"13px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",
                        gap:12,flexWrap:"wrap"}}>

                        {/* Avatar */}
                        <div style={{width:42,height:42,borderRadius:11,
                          flexShrink:0,background:NAVY,overflow:"hidden",
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {store.logoUrl?.startsWith("http")
                            ?<img src={store.logoUrl} alt=""
                               style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                            :<span style={{color:"#dc2626",fontWeight:800,fontSize:13}}>
                              {(store.storeName??"S").slice(0,2).toUpperCase()}
                            </span>}
                        </div>

                        {/* Info */}
                        <div style={{flex:1,minWidth:140}}>
                          <div style={{display:"flex",alignItems:"center",
                            gap:7,marginBottom:4,flexWrap:"wrap"}}>
                            <span style={{fontWeight:700,fontSize:14,color:NAVY}}>
                              {store.storeName}
                            </span>
                            <Pill label={store.status??"pending"} {...st}/>
                            <Pill label={store.plan??"starter"}
                              {...(PLAN[store.plan]??PLAN.starter)}/>
                          </div>
                          <div style={{fontSize:12,color:"#64748b"}}>
                            {store.merchantName}
                            {store.totalOrders>0&&` · ${store.totalOrders} orders`}
                            {store.country&&` · ${store.country}`}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{display:"flex",gap:7,flexShrink:0,flexWrap:"wrap"}}>

                          {/* View products button */}
                          <button
                            onClick={()=>setSelected(isSelected?null:store)}
                            style={{padding:"7px 13px",borderRadius:9,cursor:"pointer",
                              fontWeight:600,fontSize:12,transition:"all .15s",
                              border:`1.5px solid ${isSelected?BLUE:"#e5e7eb"}`,
                              background:isSelected?"rgba(220,38,38,.08)":"#f8fafc",
                              color:isSelected?BLUE:"#374151",
                              display:"flex",alignItems:"center",gap:5}}>
                            <Ico d={I.pkg} s={12}
                              c={isSelected?BLUE:"#374151"}/>
                            {isSelected?"Hide products":"Products"}
                          </button>

                          {/* Plan selector */}
                          <select value={store.plan??"starter"}
                            disabled={acting===store.id}
                            onChange={e=>changePlan(store,e.target.value)}
                            style={{padding:"7px 10px",borderRadius:9,cursor:"pointer",
                              fontSize:12,fontWeight:600,
                              border:"1.5px solid #e5e7eb",background:"#f8fafc",
                              color:"#374151",outline:"none",
                              opacity:acting===store.id?.5:1}}>
                            <option value="starter">Starter</option>
                            <option value="growth">Growth</option>
                            <option value="pro">Pro</option>
                          </select>

                          {/* Block/Unblock */}
                          <button onClick={()=>toggleBlock(store)}
                            disabled={acting===store.id}
                            style={{padding:"7px 13px",borderRadius:9,cursor:"pointer",
                              fontWeight:600,fontSize:12,transition:"all .15s",
                              border:`1.5px solid ${store.status==="blocked"
                                ?"rgba(22,163,74,.25)":"rgba(220,38,38,.25)"}`,
                              background:store.status==="blocked"
                                ?"rgba(22,163,74,.06)":"rgba(220,38,38,.06)",
                              color:store.status==="blocked"?C.green:C.red,
                              opacity:acting===store.id?.5:1,
                              display:"flex",alignItems:"center",gap:5}}>
                            <Ico d={store.status==="blocked"?I.check:I.block} s={12}
                              c={store.status==="blocked"?C.green:C.red}/>
                            {store.status==="blocked"?"Unblock":"Block"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: products panel */}
        {selected&&(
          <div>
            <StoreProductsPanel
              store={selected}
              onClose={()=>setSelected(null)}/>
          </div>
        )}
      </div>

      <style>{`
        .stores-stats  { grid-template-columns: repeat(4,1fr) }
        .stores-layout { grid-template-columns: 1fr }
        @media(min-width:900px){
          .stores-layout { grid-template-columns: 1fr 1fr }
        }
        @media(max-width:640px){
          .stores-stats  { grid-template-columns: repeat(2,1fr) !important }
        }
      `}</style>
    </div>
  );
}
