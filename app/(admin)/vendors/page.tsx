// app/(admin)/vendors/page.tsx
"use client";
import { useState } from "react";
import { useVendors, createVendor, toggleVendorStatus, deleteVendor } from "@/lib/hooks";
import { auth } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",red:"#ef4444"};
const blank={name:"",email:"",phone:"",country:"",website:"",description:""};

export default function VendorsPage(){
  const {data:vendors,loading}=useVendors();
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState(blank);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  async function handleCreate(e:React.FormEvent){
    e.preventDefault();
    if(!form.name||!form.email||!form.country){toast.error("Name, email and country required.");return;}
    setSaving(true);
    try{
      await createVendor({...form,status:"active",addedBy:auth.currentUser?.uid??""});
      toast.success(`Vendor "${form.name}" created!`);setForm(blank);setShowForm(false);
    }catch{toast.error("Failed.");}
    setSaving(false);
  }

  const inp:React.CSSProperties={width:"100%",background:"#161e30",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 13px",color:"#e2e8f8",fontSize:13,outline:"none",marginBottom:12};
  const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:5,textTransform:"uppercase",letterSpacing:".5px"};
  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14};

  return(<div>
    <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22}}>
      <div><h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>Vendors</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>{vendors.length} supplier{vendors.length!==1?"s":""}</p></div>
      <button onClick={()=>setShowForm(!showForm)} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Vendor</button>
    </div>
    {showForm&&<div className="fu" style={{...card,padding:22,marginBottom:18,border:`1px solid ${C.blue}50`}}>
      <div style={{fontWeight:700,fontSize:15,color:C.blue,marginBottom:16}}>New Vendor</div>
      <form onSubmit={handleCreate}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          {[{k:"name",l:"Vendor Name *",ph:"TechCore Ltd"},{k:"email",l:"Email *",ph:"orders@vendor.com"},{k:"country",l:"Country *",ph:"China"},{k:"phone",l:"Phone",ph:"+86-21-0000"},{k:"website",l:"Website",ph:"https://vendor.com"},{k:"description",l:"Description",ph:"Short description…"}].map(f=>(
            <div key={f.k}><label style={lbl}>{f.l}</label>
            <input style={{...inp,marginBottom:0}} placeholder={f.ph} value={(form as any)[f.k]} onChange={e=>set(f.k,e.target.value)} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button type="submit" disabled={saving} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px 22px",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",opacity:saving?.6:1}}>{saving?"Saving…":"Save Vendor"}</button>
          <button type="button" onClick={()=>{setShowForm(false);setForm(blank);}} style={{background:"transparent",color:"#7b88aa",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 22px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </form>
    </div>}
    {loading?<div style={{textAlign:"center",padding:"40px 0",color:"#4e5875"}}>Loading…</div>:vendors.length===0?<div style={{...card,padding:48,textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>🏭</div><div style={{fontWeight:700,fontSize:16,color:"#e2e8f8"}}>No vendors yet</div></div>:(
      <div style={{display:"grid",gap:10}}>
        {vendors.map((v,i)=>(
          <div key={v.id} className={`fu d${Math.min(i+1,5)}`} style={{...card,padding:18}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div style={{width:46,height:46,borderRadius:12,flexShrink:0,background:`${C.blue}20`,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontSize:13,fontWeight:700}}>{v.name.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,fontSize:15}}>{v.name}</span>
                  <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,textTransform:"uppercase",color:v.status==="active"?C.green:"#7b88aa",background:v.status==="active"?"rgba(34,197,94,.12)":"rgba(123,136,170,.12)"}}>{v.status}</span>
                </div>
                <div style={{fontSize:12,color:"#7b88aa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.email} · {v.country}{v.website?` · ${v.website}`:""}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginRight:12}}>
                <div style={{fontWeight:800,fontSize:18,color:C.blue}}>{v.productsCount??0}</div>
                <div style={{fontSize:10,color:"#4e5875"}}>products</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={async()=>{await toggleVendorStatus(v.id!,v.status==="active"?"inactive":"active");toast.success("Status updated.");}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#7b88aa",fontSize:12,fontWeight:600,cursor:"pointer"}}>{v.status==="active"?"Deactivate":"Activate"}</button>
                <button onClick={async()=>{if(!confirm(`Delete "${v.name}"?`))return;await deleteVendor(v.id!);toast.success("Deleted.");}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>Delete</button>
              </div>
            </div>
            {v.description&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,.05)",fontSize:12,color:"#4e5875"}}>{v.description}</div>}
          </div>
        ))}
      </div>
    )}
  </div>);
}
