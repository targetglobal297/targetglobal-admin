// app/(admin)/broadcasts/page.tsx
// Bootstrap 5 CDN + navy/gold design system
// Admin sends broadcasts → merchants see modal popup
"use client";
import { useState, useEffect } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp, orderBy, query,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const TYPES = [
  { key:"info",    label:"Info",    emoji:"ℹ️",  accent:"#dc2626", bg:"rgba(220,38,38,.08)"  },
  { key:"warning", label:"Warning", emoji:"⚠️",  accent:"#d97706", bg:"rgba(245,158,11,.08)" },
  { key:"urgent",  label:"Urgent",  emoji:"🚨",  accent:"#dc2626", bg:"rgba(239,68,68,.08)"  },
  { key:"success", label:"Success", emoji:"🎉",  accent:"#16a34a", bg:"rgba(22,163,74,.08)"  },
];

const TARGETS = [
  { key:"all",           label:"All Merchants",                 icon:"👥" },
  { key:"pending_orders",label:"Merchants with Pending Orders", icon:"📦" },
  { key:"active_only",   label:"Active Stores Only",            icon:"🟢" },
];

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export default function BroadcastsPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [preview,  setPreview]  = useState(false);
  const blank = { title:"", message:"", type:"success", target:"all" };
  const [form, setForm] = useState(blank);
  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    return onSnapshot(
      query(collection(db,"system_messages"), orderBy("createdAt","desc")),
      snap => { setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      () => setLoading(false)
    );
  },[]);

  async function handleSend() {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Title and message required."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,"system_messages"), {
        title:     form.title.trim(),
        message:   form.message.trim(),
        type:      form.type,
        target:    form.target,
        active:    true,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid ?? "admin",
      });
      toast.success("Broadcast sent!");
      setForm(blank); setShowForm(false); setPreview(false);
    } catch { toast.error("Failed to send."); }
    setSaving(false);
  }

  async function toggleActive(id:string, current:boolean) {
    try {
      await updateDoc(doc(db,"system_messages",id), { active:!current });
      toast.success(current ? "Broadcast paused" : "Broadcast resumed");
    } catch { toast.error("Update failed."); }
  }

  async function handleDelete(id:string, title:string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    try { await deleteDoc(doc(db,"system_messages",id)); toast.success("Deleted."); }
    catch { toast.error("Failed."); }
    setDeleting(null);
  }

  const selType   = TYPES.find(t=>t.key===form.type)   ?? TYPES[3];
  const selTarget = TARGETS.find(t=>t.key===form.target)?? TARGETS[0];
  const active    = messages.filter(m=>m.active);
  const inactive  = messages.filter(m=>!m.active);

  return (
    <>
      {/* Bootstrap 5 CDN */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"/>
      <style>{`
        :root{ --navy:#0f172a; --blue:#dc2626; --gold:#dc2626; }
        .bc-card{border:none;border-radius:14px;box-shadow:0 1px 6px rgba(0,0,0,.07)}
        .type-btn{border:2px solid #dee2e6;border-radius:10px;padding:12px 6px;cursor:pointer;
          background:#fff;width:100%;text-align:center;transition:all .15s}
        .type-btn:hover{border-color:#adb5bd}
        .type-btn.active{border-color:var(--navy);background:rgba(15,23,42,.04)}
        .target-btn{border:2px solid #dee2e6;border-radius:10px;padding:10px;cursor:pointer;
          background:#fff;width:100%;text-align:center;transition:all .15s;font-size:13px}
        .target-btn:hover{border-color:#adb5bd}
        .target-btn.active{border-color:var(--blue);background:rgba(220,38,38,.05);color:var(--blue)}
        .send-btn{background:var(--navy);color:var(--gold);border:none;border-radius:10px;
          padding:12px 24px;font-weight:600;font-size:14px;width:100%;transition:opacity .15s}
        .send-btn:hover:not(:disabled){opacity:.88}
        .send-btn:disabled{opacity:.4;cursor:not-allowed}
        .preview-box{border-radius:12px;padding:14px 16px}
        .badge-live{background:rgba(22,163,74,.1);color:#16a34a;
          border:1px solid rgba(22,163,74,.2);font-size:11px;padding:3px 9px;border-radius:99px}
        .badge-paused{background:#f1f5f9;color:#64748b;
          border:1px solid #e2e8f0;font-size:11px;padding:3px 9px;border-radius:99px}
        .form-control:focus,.form-select:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(220,38,38,.12)}
        .section-label{font-size:10px;font-weight:700;color:#64748b;
          text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px}
        .msg-row{display:flex;align-items:flex-start;gap:14px;
          padding:16px 18px;border-bottom:1px solid #f1f5f9}
        .msg-row:last-child{border-bottom:none}
        .msg-icon{width:44px;height:44px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;flex-shrink:0}
        @media(max-width:576px){
          .form-row-cols{flex-direction:column!important}
          .msg-row{padding:12px 14px;gap:10px}
        }
      `}</style>

      <div className="pb-5">
        {/* ── Page header ── */}
        <div className="d-flex justify-content-between align-items-start mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold mb-1" style={{fontSize:22,color:"var(--navy)",letterSpacing:"-.5px"}}>
              Broadcasts
            </h1>
            <p className="text-muted mb-0" style={{fontSize:13}}>
              Send announcements to merchants — they appear as modal popups when logged in
            </p>
          </div>
          <button
            className="btn fw-semibold px-4"
            style={{background:showForm?"#f1f5f9":"var(--navy)",color:showForm?"#374151":"var(--gold)",
              border:"none",borderRadius:10,fontSize:14}}
            onClick={()=>{setShowForm(v=>!v);setPreview(false);}}>
            {showForm ? "✕ Cancel" : "📢 New Broadcast"}
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="row g-3 mb-4">
          {[
            {l:"Total",    v:messages.length, c:"var(--navy)"},
            {l:"Active",   v:active.length,   c:"#16a34a"},
            {l:"Paused",   v:inactive.length, c:"#94a3b8"},
          ].map(s=>(
            <div key={s.l} className="col-4">
              <div className="bc-card card p-3 text-center">
                <div className="fw-bold" style={{fontSize:24,color:s.c}}>{s.v}</div>
                <div className="text-muted small mt-1">{s.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Create form ── */}
        {showForm && (
          <div className="bc-card card p-4 mb-4" style={{borderLeft:"4px solid var(--blue)"}}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0" style={{color:"var(--navy)"}}>New Broadcast</h6>
              <button
                className="btn btn-sm px-3 fw-semibold"
                style={{borderRadius:8,border:"1.5px solid #dee2e6",
                  background:preview?"rgba(220,38,38,.06)":"transparent",
                  color:preview?"var(--blue)":"#374151"}}
                onClick={()=>setPreview(v=>!v)}>
                {preview ? "✏️ Edit" : "👁 Preview"}
              </button>
            </div>

            {preview ? (
              /* ── Preview ── */
              <div>
                <p className="section-label mb-2">Merchant will see this popup:</p>
                <div className="preview-box" style={{background:selType.bg,
                  border:`1px solid ${selType.accent}40`}}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{fontSize:20}}>{selType.emoji}</span>
                    <span className="fw-semibold" style={{color:selType.accent,fontSize:13}}>
                      {form.title || "Your title here"}
                    </span>
                  </div>
                  <p className="mb-1" style={{fontSize:13,color:"#374151",lineHeight:1.65}}>
                    {form.message || "Your message here..."}
                  </p>
                  <div className="mt-2">
                    <span className="badge-live">
                      {selTarget.icon} {selTarget.label}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Title */}
                <div className="mb-3">
                  <label className="form-label section-label mb-1">Title</label>
                  <input
                    className="form-control rounded-3"
                    placeholder="e.g. 50 new Gulf products now in catalog"
                    value={form.title}
                    onChange={e=>set("title",e.target.value)}/>
                </div>

                {/* Message */}
                <div className="mb-3">
                  <label className="form-label section-label mb-1">Message</label>
                  <textarea
                    className="form-control rounded-3"
                    rows={3}
                    placeholder="Write your message to merchants..."
                    value={form.message}
                    onChange={e=>set("message",e.target.value)}
                    style={{resize:"vertical"}}/>
                </div>

                {/* Type */}
                <div className="mb-3">
                  <label className="form-label section-label mb-2">Type</label>
                  <div className="row g-2">
                    {TYPES.map(t=>(
                      <div key={t.key} className="col-3">
                        <button
                          type="button"
                          className={`type-btn${form.type===t.key?" active":""}`}
                          onClick={()=>set("type",t.key)}>
                          <div style={{fontSize:22}}>{t.emoji}</div>
                          <div className="mt-1" style={{fontSize:12,
                            fontWeight:form.type===t.key?600:400,
                            color:form.type===t.key?t.accent:"#6b7280"}}>
                            {t.label}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target */}
                <div className="mb-4">
                  <label className="form-label section-label mb-2">Target audience</label>
                  <div className="row g-2">
                    {TARGETS.map(t=>(
                      <div key={t.key} className="col-4">
                        <button
                          type="button"
                          className={`target-btn${form.target===t.key?" active":""}`}
                          onClick={()=>set("target",t.key)}>
                          <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                          <div style={{fontSize:11,fontWeight:form.target===t.key?600:400,
                            lineHeight:1.4}}>
                            {t.label}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="d-flex gap-2">
              <button
                className="send-btn flex-grow-1"
                onClick={handleSend}
                disabled={saving||!form.title.trim()||!form.message.trim()}>
                {saving ? "Sending…" : "📢 Send Broadcast Now"}
              </button>
              <button
                className="btn btn-outline-secondary px-4 rounded-3"
                onClick={()=>{setForm(blank);setShowForm(false);setPreview(false);}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Broadcast list ── */}
        {loading ? (
          <div className="text-center py-5 text-muted">Loading broadcasts…</div>
        ) : messages.length === 0 ? (
          <div className="bc-card card p-5 text-center">
            <div style={{fontSize:48,marginBottom:14}}>📢</div>
            <h5 className="fw-bold mb-2" style={{color:"var(--navy)"}}>No broadcasts yet</h5>
            <p className="text-muted mb-3" style={{fontSize:14}}>
              Create your first broadcast to notify all merchants instantly.
            </p>
            <button className="btn px-4 mx-auto d-block fw-semibold"
              style={{background:"var(--navy)",color:"var(--gold)",
                border:"none",borderRadius:10}}
              onClick={()=>setShowForm(true)}>
              Create First Broadcast
            </button>
          </div>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <div className="mb-4">
                <p className="section-label" style={{color:"#16a34a"}}>
                  ● Active — showing to merchants now ({active.length})
                </p>
                <div className="bc-card card overflow-hidden">
                  {active.map((m,i)=>{
                    const t = TYPES.find(t=>t.key===m.type) ?? TYPES[0];
                    const tg = TARGETS.find(tg=>tg.key===m.target) ?? TARGETS[0];
                    return (
                      <div key={m.id} className="msg-row"
                        style={{borderTop:i===0?`3px solid ${t.accent}`:"none"}}>
                        <div className="msg-icon" style={{background:t.bg}}>
                          {t.emoji}
                        </div>
                        <div className="flex-grow-1 min-width-0">
                          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                            <span className="fw-semibold" style={{fontSize:14,color:"var(--navy)"}}>
                              {m.title}
                            </span>
                            <span className="badge-live">Live</span>
                          </div>
                          <p className="text-muted mb-1" style={{fontSize:13,lineHeight:1.55}}>
                            {m.message}
                          </p>
                          <div className="d-flex gap-3 flex-wrap">
                            <span className="text-muted" style={{fontSize:11}}>
                              {tg.icon} {tg.label}
                            </span>
                            <span className="text-muted" style={{fontSize:11}}>
                              🕐 {m.createdAt?.toDate?.() ? timeAgo(m.createdAt.toDate()) : "just now"}
                            </span>
                          </div>
                        </div>
                        <div className="d-flex gap-2 flex-shrink-0">
                          <button
                            className="btn btn-sm btn-outline-warning rounded-3 fw-semibold"
                            onClick={()=>toggleActive(m.id,m.active)}>
                            ⏸ Pause
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-3"
                            disabled={deleting===m.id}
                            onClick={()=>handleDelete(m.id,m.title)}>
                            {deleting===m.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inactive */}
            {inactive.length > 0 && (
              <div>
                <p className="section-label">Paused ({inactive.length})</p>
                <div className="bc-card card overflow-hidden" style={{opacity:.65}}>
                  {inactive.map(m=>{
                    const t = TYPES.find(t=>t.key===m.type) ?? TYPES[0];
                    const tg = TARGETS.find(tg=>tg.key===m.target) ?? TARGETS[0];
                    return (
                      <div key={m.id} className="msg-row">
                        <div className="msg-icon" style={{background:"#f1f5f9",fontSize:18}}>
                          {t.emoji}
                        </div>
                        <div className="flex-grow-1 min-width-0">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-semibold text-muted" style={{fontSize:13}}>
                              {m.title}
                            </span>
                            <span className="badge-paused">Paused</span>
                          </div>
                          <span className="text-muted" style={{fontSize:11}}>
                            {tg.icon} {tg.label} · {m.createdAt?.toDate?.() ? timeAgo(m.createdAt.toDate()) : "—"}
                          </span>
                        </div>
                        <div className="d-flex gap-2 flex-shrink-0">
                          <button
                            className="btn btn-sm btn-outline-success rounded-3 fw-semibold"
                            onClick={()=>toggleActive(m.id,m.active)}>
                            ▶ Resume
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger rounded-3"
                            disabled={deleting===m.id}
                            onClick={()=>handleDelete(m.id,m.title)}>
                            {deleting===m.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
