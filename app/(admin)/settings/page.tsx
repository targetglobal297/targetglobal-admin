// app/(admin)/settings/page.tsx
"use client";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",red:"#ef4444",amber:"#f59e0b"};

function Toggle({label,desc,on}:{label:string;desc:string;on:boolean}){
  const [active,setActive]=useState(on);
  return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
    <div><div style={{fontSize:13,fontWeight:600}}>{label}</div><div style={{fontSize:11,color:"#4e5875",marginTop:2}}>{desc}</div></div>
    <div onClick={()=>setActive(a=>!a)} style={{width:42,height:24,borderRadius:99,cursor:"pointer",background:active?C.blue:"#1c2640",display:"flex",alignItems:"center",justifyContent:active?"flex-end":"flex-start",padding:"0 3px",transition:"all .2s",flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff"}}/>
    </div>
  </div>);
}

export default function SettingsPage(){
  const router=useRouter();
  const [saving,setSaving]=useState(false);
  async function save(){setSaving(true);await new Promise(r=>setTimeout(r,700));setSaving(false);toast.success("Settings saved.");}

  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,padding:22,marginBottom:14};
  const inp:React.CSSProperties={width:"100%",background:"#161e30",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:9,padding:"9px 12px",color:"#e2e8f8",fontSize:13,outline:"none",marginBottom:10};

  return(<div>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>Platform Settings</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>Global configuration for ShopGrid</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
      <div style={card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Commission & Margins</div>
        {[{l:"Platform Commission (all stores)",v:"2%"},{l:"Default Merchant Margin",v:"20%"},{l:"Starter Plan Commission",v:"3%"},{l:"Growth Plan Commission",v:"2.5%"},{l:"Pro Plan Commission",v:"2%"}].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <span style={{fontSize:12,color:"#7b88aa"}}>{r.l}</span>
            <input defaultValue={r.v} style={{...inp,width:90,marginBottom:0,textAlign:"right"}}/>
          </div>
        ))}
        <button onClick={save} style={{marginTop:14,background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer",opacity:saving?.6:1}}>{saving?"Saving…":"Save Rates"}</button>
      </div>
      <div style={card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Order Rules</div>
        {[{l:"Est. Delivery Time",v:"3 days"},{l:"Submitted → Processing",v:"24 hours"},{l:"Processing → Shipped",v:"24 hours"},{l:"Shipped → Delivered",v:"3 days"},{l:"Order Processing Limit",v:"48 hours"},{l:"Min BTC Withdrawal",v:"0.0001 BTC"},{l:"Min ETH Withdrawal",v:"0.001 ETH"},{l:"Min USDT Withdrawal",v:"10 USDT"},{l:"Auto-block After",v:"48h no funds"}].map(r=>(
          <div key={r.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            <span style={{fontSize:12,color:"#7b88aa"}}>{r.l}</span>
            <input defaultValue={r.v} style={{...inp,width:120,marginBottom:0,textAlign:"right"}}/>
          </div>
        ))}
        <button onClick={save} style={{marginTop:14,background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Save Rules</button>
      </div>
      <div style={card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Platform Plans</div>
        {[{name:"Starter",price:"$9/mo",max:"10 products",comm:"3%"},{name:"Growth",price:"$19/mo",max:"50 products",comm:"2.5%"},{name:"Pro",price:"$29/mo",max:"Unlimited",comm:"2%"}].map(p=>(
          <div key={p.name} style={{padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,.06)",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:700}}>{p.name}</div><div style={{fontSize:11,color:"#4e5875",marginTop:2}}>{p.max} · {p.comm} commission</div></div>
            <div style={{fontFamily:"monospace",fontWeight:700,color:C.green}}>{p.price}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Security</div>
        <Toggle label="Two-Factor Auth"  desc="Require 2FA for admin actions"          on={true}/>
        <Toggle label="Audit Log"        desc="Log all admin actions to Firestore"     on={true}/>
        <Toggle label="IP Whitelisting"  desc="Restrict admin access by IP"            on={false}/>
        <Toggle label="Session Timeout"  desc="Auto sign-out after 2 hours"            on={true}/>
        <Toggle label="Auto-block Stores" desc="Block stores with 48h unpaid orders"  on={true}/>
      </div>
      <div style={{...card,border:"1px solid rgba(239,68,68,.2)"}}>
        <div style={{fontWeight:700,fontSize:15,color:C.red,marginBottom:10}}>Account</div>
        <div style={{fontSize:13,color:"#7b88aa",marginBottom:14}}>Signed in as <strong style={{color:"#e2e8f8"}}>{auth.currentUser?.email}</strong></div>
        <button onClick={async()=>{await signOut(auth);router.replace("/login");}} style={{background:"rgba(239,68,68,.1)",color:C.red,border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Sign Out</button>
      </div>
    </div>
  </div>);
}
