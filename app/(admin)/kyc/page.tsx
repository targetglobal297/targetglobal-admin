// app/(admin)/kyc/page.tsx — with ID photo lightbox
"use client";
import { useState } from "react";
import { useKYC, approveKYC, rejectKYC } from "@/lib/hooks";
import { auth, db } from "@/lib/firebase/client";
import { getDoc, doc } from "firebase/firestore";
import { sendEmail } from "@/lib/email";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444"};
const ID_LABELS:Record<string,string>={passport:"Passport",national_id:"National ID",drivers_license:"Driver's License"};

function Badge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string}>={
    pending:{c:C.amber,bg:"rgba(245,158,11,.12)"},
    approved:{c:C.green,bg:"rgba(34,197,94,.12)"},
    rejected:{c:C.red,bg:"rgba(239,68,68,.12)"},
  };
  const st=m[s]??{c:"#7b88aa",bg:"rgba(123,136,170,.12)"};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",color:st.c,background:st.bg}}>{s}</span>;
}

export default function KYCPage(){
  const [filter,setFilter]=useState("All");
  const {subs=[],loading}=useKYC(filter==="All"?undefined:filter);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [rejReason,setRejReason]=useState("");
  const [acting,setActing]=useState<string|null>(null);
  const [lightbox,setLightbox]=useState<{url:string,label:string}|null>(null);

  async function approve(k:any){
    setActing(k.id!);
    try{
      await approveKYC(k, auth.currentUser?.uid??"");
      toast.success(`${k.storeName} approved & activated!`);
      // Send KYC approved email — look up merchant email from users collection
      const userSnap = await getDoc(doc(db,"users",k.merchantId));
      if(userSnap.exists()){
        const userData = userSnap.data();
        sendEmail({
          type:      "kyc_approved",
          to:        userData.email ?? userData.merchantEmail ?? "",
          name:      userData.displayName ?? k.storeName,
          storeName: k.storeName,
        });
      }
    }
    catch{ toast.error("Failed."); }
    setActing(null);
  }

  async function reject(k:any){
    if(!rejReason.trim()){toast.error("Enter rejection reason.");return;}
    setActing(k.id!);
    try{
      await rejectKYC(k, auth.currentUser?.uid??"", rejReason);
      toast.success("KYC rejected.");
      // Send KYC rejected email — look up merchant email from users collection
      const userSnap = await getDoc(doc(db,"users",k.merchantId));
      if(userSnap.exists()){
        const userData = userSnap.data();
        sendEmail({
          type:      "kyc_rejected",
          to:        userData.email ?? userData.merchantEmail ?? "",
          name:      userData.displayName ?? k.storeName,
          storeName: k.storeName,
          reason:    rejReason,
        });
      }
      setRejReason(""); setExpanded(null);
    }
    catch{ toast.error("Failed."); }
    setActing(null);
  }

  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14};
  const pending=subs.filter(k=>k.status==="pending").length;

  return(<div>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>KYC Verification</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>Review merchant identity documents before activating stores</p>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:16}}>
      {[
        {l:"Pending",  v:subs.filter(k=>k.status==="pending").length,  c:C.amber},
        {l:"Approved", v:subs.filter(k=>k.status==="approved").length, c:C.green},
        {l:"Rejected", v:subs.filter(k=>k.status==="rejected").length, c:C.red},
        {l:"Total",    v:subs.length,                                   c:C.blue},
      ].map((s,i)=>(
        <div key={s.l} className={`fu d${i+1}`} style={{...card,padding:14,textAlign:"center"}}>
          <div style={{fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
          <div style={{fontSize:11,color:"#7b88aa",marginTop:2}}>{s.l}</div>
        </div>
      ))}
    </div>

    {/* Pending banner */}
    {pending>0&&(
      <div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontWeight:700,color:C.amber,fontSize:13}}>⏳ {pending} merchant{pending>1?"s":""} waiting for ID verification</div>
        <button onClick={()=>setFilter("pending")} style={{background:C.amber,color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Review Now</button>
      </div>
    )}

    {/* Filter chips */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["All","pending","approved","rejected"].map(f=>(
        <button key={f} onClick={()=>setFilter(f)}
          style={{padding:"6px 16px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",
            border:`1.5px solid ${filter===f?C.blue:"rgba(255,255,255,.08)"}`,
            background:filter===f?`${C.blue}18`:"transparent",
            color:filter===f?C.blue:"#7b88aa"}}>
          {f}
        </button>
      ))}
    </div>

    {loading
      ?<div style={{textAlign:"center",padding:"40px 0",color:"#4e5875"}}>Loading…</div>
      :subs.length===0
      ?<div style={{...card,padding:48,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>🪪</div>
        <div style={{fontWeight:700,fontSize:16,color:"#e2e8f8"}}>No KYC submissions</div>
      </div>
      :<div style={{display:"grid",gap:12}}>
        {subs.map((k,i)=>(
          <div key={k.id} className={`fu d${Math.min(i%5+1,5)}`}
            style={{...card,overflow:"hidden",
              border:k.status==="pending"?"1px solid rgba(245,158,11,.3)":"1px solid rgba(255,255,255,.08)"}}>

            {/* Header row */}
            <div style={{padding:18,cursor:"pointer"}} onClick={()=>setExpanded(expanded===k.id?null:k.id!)}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,flexShrink:0,background:`${C.blue}20`,color:C.blue,fontFamily:"monospace",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {(k.merchantName??'??').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:"#e2e8f8",marginBottom:2}}>{k.merchantName??'Unknown'}</div>
                    <div style={{fontSize:12,color:"#7b88aa"}}>{k.merchantEmail} · {k.storeName}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <Badge s={k.status}/>
                  <span style={{color:"#4e5875",fontSize:14}}>{expanded===k.id?"▲":"▼"}</span>
                </div>
              </div>
            </div>

            {/* Expanded */}
            {expanded===k.id&&(
              <div style={{borderTop:"1px solid rgba(255,255,255,.06)",padding:18}}>

                {/* Document details */}
                <div style={{background:"#161e30",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:12,textTransform:"uppercase",letterSpacing:".5px"}}>
                    Submitted Information
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
                    {[
                      ["ID Type",     ID_LABELS[k.idType]??k.idType],
                      ["ID Number",   k.idNumber],
                      ["Country",     k.country],
                      ["Date of Birth",k.dateOfBirth],
                      ["ID Expiry",   k.idExpiryDate||"—"],
                      ["Address",     k.fullAddress||"—"],
                    ].map(([lbl,val])=>(
                      <div key={lbl}>
                        <div style={{fontSize:10,color:"#4e5875",marginBottom:3}}>{lbl}</div>
                        <div style={{fontSize:13,fontWeight:600,color:"#e2e8f8"}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ID Photos */}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:10,textTransform:"uppercase",letterSpacing:".5px"}}>
                    ID Photos — click to view full size
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[{label:"ID Front",url:k.idFrontUrl},{label:"ID Back",url:k.idBackUrl}].map(photo=>(
                      <div key={photo.label}>
                        <div style={{fontSize:11,color:"#7b88aa",marginBottom:6,fontWeight:600}}>{photo.label}</div>
                        {photo.url&&photo.url.startsWith("http")?(
                          <div onClick={()=>setLightbox({url:photo.url,label:photo.label})}
                            style={{position:"relative",borderRadius:10,overflow:"hidden",cursor:"pointer",border:"1px solid rgba(255,255,255,.08)",transition:"border-color .15s"}}
                            onMouseEnter={e=>(e.currentTarget.style.borderColor=C.blue)}
                            onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.08)")}>
                            <img src={photo.url} alt={photo.label}
                              style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}}/>
                            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}
                              onMouseEnter={e=>{(e.currentTarget as any).style.background="rgba(0,0,0,.4)";(e.currentTarget.querySelector("span") as any).style.opacity="1";}}
                              onMouseLeave={e=>{(e.currentTarget as any).style.background="rgba(0,0,0,0)";(e.currentTarget.querySelector("span") as any).style.opacity="0";}}>
                              <span style={{color:"#fff",fontSize:13,fontWeight:700,opacity:0,transition:"opacity .15s",background:"rgba(0,0,0,.5)",padding:"6px 14px",borderRadius:8}}>
                                🔍 View Full Size
                              </span>
                            </div>
                          </div>
                        ):(
                          <div style={{width:"100%",height:120,borderRadius:10,border:"1px dashed rgba(255,255,255,.15)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#1c2640",gap:6}}>
                            <span style={{fontSize:28}}>🪪</span>
                            <span style={{fontSize:11,color:"#4e5875"}}>{photo.url?"Invalid URL":"Not uploaded"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rejection reason display */}
                {k.status==="rejected"&&k.rejectionReason&&(
                  <div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.red}}>
                    Reason: {k.rejectionReason}
                  </div>
                )}

                {/* Approve / Reject actions */}
                {k.status==="pending"&&(
                  <div>
                    <input value={rejReason} onChange={e=>setRejReason(e.target.value)}
                      placeholder="Rejection reason (required if rejecting)…"
                      style={{width:"100%",background:"#1c2640",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 13px",color:"#e2e8f8",fontSize:13,outline:"none",marginBottom:12,boxSizing:"border-box" as const}}
                      onFocus={e=>(e.target.style.borderColor=C.red)}
                      onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>approve(k)} disabled={acting===k.id}
                        style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid rgba(34,197,94,.3)",background:"rgba(34,197,94,.1)",color:C.green,fontWeight:700,fontSize:14,cursor:"pointer",opacity:acting===k.id?.5:1}}>
                        {acting===k.id?"Processing…":"✓ Approve & Activate"}
                      </button>
                      <button onClick={()=>reject(k)} disabled={acting===k.id}
                        style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.1)",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",opacity:acting===k.id?.5:1}}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    }

    {/* ── LIGHTBOX ── */}
    {lightbox&&(
      <>
        <div onClick={()=>setLightbox(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,backdropFilter:"blur(6px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
          zIndex:201,maxWidth:"min(92vw,800px)",width:"100%"}}>
          <div style={{background:"#101624",borderRadius:16,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,.6)"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
              <div style={{fontWeight:700,color:"#e2e8f8",fontSize:14}}>🪪 {lightbox.label}</div>
              <button onClick={()=>setLightbox(null)}
                style={{width:30,height:30,borderRadius:8,background:"rgba(255,255,255,.08)",border:"none",color:"#7b88aa",cursor:"pointer",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                ✕
              </button>
            </div>
            {/* Image */}
            <div style={{padding:12,background:"#0a0f1c",maxHeight:"75vh",overflowY:"auto",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <img src={lightbox.url} alt={lightbox.label}
                style={{maxWidth:"100%",borderRadius:8,display:"block"}}/>
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",gap:10}}>
              <a href={lightbox.url} target="_blank" rel="noopener noreferrer"
                style={{flex:1,padding:"10px",borderRadius:9,background:C.blue,color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>
                Open Full Size ↗
              </a>
              <button onClick={()=>setLightbox(null)}
                style={{padding:"10px 20px",borderRadius:9,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#7b88aa",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    )}
  </div>);
}
