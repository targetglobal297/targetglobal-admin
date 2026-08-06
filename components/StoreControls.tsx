// components/StoreControls.tsx  (ADMIN APP — dark theme)
"use client";
import { useState } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const GOLD = "#dc2626";
const C = { blue:"#dc2626", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
            violet:"#a78bfa", sky:"#38bdf8", muted:"#7b88aa", panel:"#1c2640" };

const PLANS = [
  { key:"starter", label:"Starter", price:"Free",   comm:0.03,  max:350,  color:C.muted  },
  { key:"silver",  label:"Silver",  price:"$19/mo", comm:0.025, max:500,  color:C.sky    },
  { key:"gold",    label:"Gold",    price:"$29/mo", comm:0.02,  max:1000, color:GOLD     },
];

function Star({ shown, i, size=24, onClick, onHover }: {
  shown:number; i:number; size?:number; onClick:()=>void; onHover:()=>void;
}) {
  const fill = Math.max(0, Math.min(1, shown - (i - 1)));
  return (
    <button type="button" onClick={onClick} onMouseEnter={onHover}
      aria-label={`Set rating to ${i}`}
      style={{ background:"none", border:"none", padding:2, cursor:"pointer", lineHeight:0 }}>
      <span style={{ position:"relative", width:size, height:size, display:"inline-block" }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="rgba(255,255,255,.12)"
          style={{ position:"absolute", inset:0 }}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        {fill > 0 && (
          <span style={{ position:"absolute", inset:0, width:`${fill*100}%`, overflow:"hidden" }}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill={GOLD}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
        )}
      </span>
    </button>
  );
}

export default function StoreControls({ store, onDone }: { store:any; onDone?:()=>void }) {
  const [rating,      setRating]      = useState<number>(Number(store?.rating ?? 0));
  const [hoverRating, setHoverRating] = useState<number|null>(null);
  const [ratingCount, setRatingCount] = useState<number>(Number(store?.ratingCount ?? 0));
  const [plan,        setPlan]        = useState<string>(store?.plan ?? "starter");
  const [saving,      setSaving]      = useState(false);

  const shown = hoverRating ?? rating;
  const dirty =
    rating      !== Number(store?.rating ?? 0) ||
    ratingCount !== Number(store?.ratingCount ?? 0) ||
    plan        !== (store?.plan ?? "starter");

  async function save() {
    setSaving(true);
    try {
      const p = PLANS.find(x => x.key === plan) ?? PLANS[0];
      const planChanged = plan !== (store?.plan ?? "starter");

      await updateDoc(doc(db, "stores", store.id), {
        rating, ratingCount,
        ratingSetAt:    serverTimestamp(),
        plan,
        commissionRate: p.comm,
        maxProducts:    p.max,
        updatedAt:      serverTimestamp(),
      });

      if (planChanged && store.merchantId) {
        await addDoc(collection(db, "notifications"), {
          userId:    store.merchantId,
          title:     `🎉 You're now on the ${p.label} plan`,
          body:      `${(p.comm*100).toFixed(1)}% commission and up to ${p.max.toLocaleString()} products.`,
          type:      "system",
          read:      false,
          createdAt: serverTimestamp(),
        });
      }

      toast.success("Store updated");
      onDone?.();
    } catch (e:any) {
      console.error("[StoreControls]", e);
      toast.error("Couldn't save. Please try again.");
    }
    setSaving(false);
  }

  const label: React.CSSProperties = {
    fontSize:11, fontWeight:700, color:C.muted, display:"block",
    marginBottom:8, textTransform:"uppercase", letterSpacing:".5px",
  };

  return (
    <div style={{ background:C.panel, borderRadius:12, padding:16,
      border:"1px solid rgba(255,255,255,.06)" }}>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20 }}>

        {/* ── Rating ── */}
        <div>
          <label style={label}>Store Rating</label>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, flexWrap:"wrap" }}
            onMouseLeave={() => setHoverRating(null)}>
            <div style={{ display:"flex" }}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} shown={shown} i={i}
                  onClick={() => setRating(i)}
                  onHover={() => setHoverRating(i)}/>
              ))}
            </div>
            <span style={{ fontFamily:"monospace", fontWeight:800, fontSize:20, color:GOLD }}>
              {rating.toFixed(1)}
            </span>
            {rating > 0 && (
              <button type="button" onClick={() => setRating(0)}
                style={{ fontSize:11, color:C.red, background:"none", border:"none",
                  cursor:"pointer", fontWeight:600 }}>
                Clear
              </button>
            )}
          </div>

          {/* Fine control */}
          <input type="range" min={0} max={5} step={0.1} value={rating}
            onChange={e => setRating(Number(e.target.value))}
            style={{ width:"100%", accentColor:GOLD, cursor:"pointer", marginBottom:12 }}/>

          <label style={{ ...label, marginBottom:5 }}>
            Review Count
          </label>
          <input type="number" min={0} value={ratingCount}
            onChange={e => setRatingCount(Math.max(0, Number(e.target.value)))}
            style={{ width:110, padding:"8px 11px", borderRadius:8, fontSize:13,
              border:"1px solid rgba(255,255,255,.1)", background:"#131a2e",
              color:"#e2e8f0", outline:"none" }}/>
          <div style={{ fontSize:10, color:C.muted, marginTop:5 }}>
            0 shows "Assessed by TargetGlobal"
          </div>
        </div>

        {/* ── Plan ── */}
        <div>
          <label style={label}>Subscription Plan</label>
          <div style={{ display:"grid", gap:7 }}>
            {PLANS.map(p => {
              const sel = plan === p.key;
              return (
                <button key={p.key} type="button" onClick={() => setPlan(p.key)}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px",
                    borderRadius:9, cursor:"pointer", textAlign:"left", width:"100%",
                    border:`1.5px solid ${sel?p.color:"rgba(255,255,255,.08)"}`,
                    background:sel?`${p.color}18`:"#131a2e", transition:"all .15s" }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                    border:`2px solid ${sel?p.color:"rgba(255,255,255,.2)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {sel && <div style={{ width:7, height:7, borderRadius:"50%", background:p.color }}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:sel?p.color:"#e2e8f0" }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize:10.5, color:C.muted, marginTop:1 }}>
                      {(p.comm*100).toFixed(1)}% · {p.max.toLocaleString()} products
                    </div>
                  </div>
                  <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:12, color:C.muted }}>
                    {p.price}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save */}
      <button type="button" onClick={save} disabled={saving || !dirty}
        style={{ width:"100%", marginTop:16, padding:"11px", borderRadius:9, border:"none",
          background: !dirty ? "rgba(255,255,255,.06)"
                    : saving ? "rgba(220,38,38,.4)"
                    : `linear-gradient(135deg,#3b62d9,${C.blue})`,
          color: !dirty ? C.muted : "#fff",
          fontWeight:700, fontSize:13,
          cursor: saving || !dirty ? "default" : "pointer" }}>
        {saving ? "Saving…" : dirty ? "Save Rating & Plan" : "No changes"}
      </button>
    </div>
  );
}
