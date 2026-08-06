// app/(admin)/orders/page.tsx — auto-disperse funds + notification + transaction on delivered
"use client";
import { useState } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, limit, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { useAllOrders, updateOrderStatus, cancelOrderAndBlock, adjustWalletBalance } from "@/lib/hooks";
type OrderStatus = "pending"|"submitted"|"processing"|"shipped"|"delivered"|"cancelled";
import toast from "react-hot-toast";
import { sendEmail } from "@/lib/email";

const STATUS_PATH = [
  {key:"pending",    label:"Received",   icon:"📥"},
  {key:"submitted",  label:"Submitted",  icon:"✅"},
  {key:"processing", label:"Processing", icon:"⚙️"},
  {key:"shipped",    label:"Shipped",    icon:"🚚"},
  {key:"delivered",  label:"Delivered",  icon:"🎉"},
];

function StatusPath({status}:{status:string}){
  const idx=STATUS_PATH.findIndex(s=>s.key===status);
  if(status==="cancelled") return <span style={{fontSize:11,color:"#ef4444",fontWeight:600}}>❌ Cancelled</span>;
  return(
    <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto",paddingBottom:2}}>
      {STATUS_PATH.map((s,i)=>{
        const done=i<idx, active=i===idx;
        return(
          <div key={s.key} style={{display:"flex",alignItems:"center",flex:i<STATUS_PATH.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                background:done?"#22c55e":active?"#dc2626":"rgba(255,255,255,.06)",
                border:`2px solid ${done?"#22c55e":active?"#dc2626":"rgba(255,255,255,.1)"}`,color:"#fff"}}>
                {done?"✓":s.icon}
              </div>
              <div style={{fontSize:8,color:done?"#22c55e":active?"#dc2626":"#4e5875",whiteSpace:"nowrap"}}>{s.label}</div>
            </div>
            {i<STATUS_PATH.length-1&&<div style={{flex:1,height:2,margin:"0 2px 14px",background:done?"#22c55e":"rgba(255,255,255,.08)"}}/>}
          </div>
        );
      })}
    </div>
  );
}

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444",violet:"#a78bfa",sky:"#38bdf8"};
const STATUSES:OrderStatus[]=["pending","submitted","processing","shipped","delivered","cancelled"];

function SBadge({s}:{s:string}){
  const m:Record<string,{c:string,bg:string}>={
    pending:   {c:C.violet,bg:"rgba(167,139,250,.12)"},
    submitted: {c:C.blue,  bg:"rgba(220,38,38,.12)"},
    processing:{c:C.amber, bg:"rgba(245,158,11,.12)"},
    shipped:   {c:C.sky,   bg:"rgba(56,189,248,.12)"},
    delivered: {c:C.green, bg:"rgba(34,197,94,.12)"},
    cancelled: {c:C.red,   bg:"rgba(239,68,68,.12)"},
  };
  const st=m[s]??{c:"#7b88aa",bg:"rgba(123,136,170,.12)"};
  return <span style={{fontFamily:"monospace",fontSize:10,fontWeight:600,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",color:st.c,background:st.bg}}>{s}</span>;
}

// ── Auto-disperse funds when order marked delivered ───────────
async function disperseFunds(order: any) {
  // Guard: don't pay twice
  if (order.fundsReimbursed) {
    toast.error("Funds already disbursed for this order.");
    return false;
  }

  const reimbursement = order.totalReimbursement ?? order.merchantEarnings ?? 0;
  const profit        = order.merchantEarnings ?? 0;
  const merchantId    = order.merchantId;
  const storeId       = order.storeId;
  const storeName     = order.storeName ?? "Unknown Store";

  if (!merchantId || reimbursement <= 0) {
    console.warn("No merchantId or zero reimbursement — skipping disperse");
    return true; // still mark delivered, just no payment
  }

  try {
    // 1. Credit the merchant wallet
    await adjustWalletBalance({
      merchantId,
      storeId,
      merchantName: order.merchantName ?? storeName,
      type: "credit",
      coin: "USDT",
      network: "TRC20",
      amountUSD: reimbursement,
      reason: `Order delivered — payment for order #${order.id?.slice(0,8).toUpperCase()}`,
    });

    // 2. Mark order as reimbursed + record delivery time
    await updateDoc(doc(db,"orders",order.id), {
      fundsReimbursed: true,
      reimbursedAt: serverTimestamp(),
      reimbursedAmount: reimbursement,
    });

    // 3. Send notification to merchant
    await addDoc(collection(db,"notifications"), {
      userId:  merchantId,
      type:    "earning",
      title:   "💸 Payment Received!",
      body:    `Your payment of $${reimbursement.toFixed(2)} for the order by ${order.customer?.name ?? "your customer"} has been credited to your wallet. Net profit: $${profit.toFixed(2)}.`,
      read:    false,
      orderId: order.id,
      createdAt: serverTimestamp(),
    });

    return true;
  } catch(err: any) {
    console.error("Disperse failed:", err);
    toast.error("Order marked delivered but wallet credit failed. Credit manually in Wallet Management.");
    return false;
  }
}

export default function OrdersPage(){
  const [filter,setFilter]=useState("All");
  const {orders=[],loading}=useAllOrders();
  const [expanded,setExpanded]=useState<string|null>(null);
  const [tracking,setTracking]=useState<Record<string,string>>({});
  const [saving,setSaving]=useState<string|null>(null);
  const [dispatchDate,setDispatchDate]=useState<Record<string,string>>({});

  const filtered = filter==="All" ? orders : orders.filter((o:any)=>o.status===filter);
  const pendingCount=orders.filter((o:any)=>o.status==="pending"||o.status==="submitted"||o.status==="processing").length;
  const totalCommission=orders.reduce((a:number,o:any)=>a+(o.platformCommission??0),0);

  async function handleStatus(order:any, status:OrderStatus, track?:string){
    setSaving(order.id);
    try {
      // If marking as delivered — disperse funds first
      if (status === "delivered") {
        const ok = await disperseFunds(order);
        if (!ok) {
          // disperseFunds already showed an error toast
          setSaving(null);
          return;
        }
        await updateOrderStatus(order.id, status, track);
        toast.success(
          order.fundsReimbursed
            ? `Order marked delivered. (Funds already disbursed)`
            : `✅ Delivered! $${(order.totalReimbursement??order.merchantEarnings??0).toFixed(2)} credited to ${order.storeName}'s wallet.`
        );
        // Notify merchant of delivery + profit credit
        // Look up email from users collection if not on the order doc
        const toEmail = order.merchantEmail || await (async () => {
          try {
            const uSnap = await getDocs(query(collection(db,"users"), where("uid","==",order.merchantId), limit(1)));
            return uSnap.docs[0]?.data()?.email ?? null;
          } catch { return null; }
        })();
        if (!toEmail) console.warn("[orders] could not resolve merchantEmail for order", order.id);
        if (toEmail) {
          sendEmail({
            type:           "order_status_update",
            to:             toEmail,
            merchantName:   order.storeName ?? "Merchant",
            storeName:      order.storeName ?? "",
            customerName:   order.customer?.name ?? "Customer",
            orderId:        order.id,
            status:         "delivered",
            merchantProfit: order.totalReimbursement ?? order.merchantEarnings ?? 0,
          });
        }
      } else {
        await updateOrderStatus(order.id, status, track);
        toast.success(`Order marked as ${status}.`);
        // Notify merchant of status change
        const toEmail2 = order.merchantEmail || await (async () => {
          try {
            const uSnap = await getDocs(query(collection(db,"users"), where("uid","==",order.merchantId), limit(1)));
            return uSnap.docs[0]?.data()?.email ?? null;
          } catch { return null; }
        })();
        if (toEmail2) {
          sendEmail({
            type:            "order_status_update",
            to:              toEmail2,
            merchantName:    order.storeName ?? "Merchant",
            storeName:       order.storeName ?? "",
            customerName:    order.customer?.name ?? "Customer",
            orderId:         order.id,
            status:          status as any,
            trackingNumber:  track,
          });
        }
      }
    } catch {
      toast.error("Update failed.");
    }
    setSaving(null);
  }

  async function saveDispatchDate(orderId:string) {
    const raw = dispatchDate[orderId];
    if (!raw) { toast.error("Pick a date and time first."); return; }
    setSaving(orderId);
    try {
      const ts    = new Date(raw);
      const order = orders.find((o:any) => o.id === orderId);
      await updateDoc(doc(db,"orders",orderId),{
        scheduledDispatchAt: Timestamp.fromDate(ts),
        updatedAt: serverTimestamp(),
      });
      toast.success("Dispatch date set — merchant will see this on their order.");
      // If dispatch date is now or in the past, merchant can already see the order
      // Send them an order_placed notification email
      if (order && ts.getTime() <= Date.now() && order.merchantEmail) {
        sendEmail({
          type:            "order_placed",
          to:              order.merchantEmail,
          merchantName:    order.merchantName ?? order.storeName ?? "Merchant",
          storeName:       order.storeName ?? "",
          customerName:    order.customer?.name ?? "Customer",
          customerAddress: (() => {
            const a = order.customer?.address;
            return a ? [a.line1, a.city, a.country].filter(Boolean).join(", ") : undefined;
          })(),
          orderId:         order.id,
          items:           (order.items ?? []).map((it:any) => ({
            productName:  it.productName,
            productImage: it.productImage ?? it.imageUrl,
            size:         it.size,
            color:        it.color,
            quantity:     it.quantity ?? 1,
            unitPrice:    it.unitPrice ?? 0,
          })),
          totalBaseCost:  order.totalBaseCost  ?? 0,
          merchantProfit: order.merchantEarnings ?? 0,
        });
      }
    } catch { toast.error("Failed to save."); }
    setSaving(null);
  }

  async function handleBlock(order:any){
    if(!confirm(`Cancel order and block ${order.storeName}?`))return;
    setSaving(order.id);
    try{
      await cancelOrderAndBlock(order.id,order.storeId);
      toast.success(`Order cancelled & ${order.storeName} blocked.`);
    }catch{ toast.error("Failed."); }
    setSaving(null);
  }

  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14};

  return(<div>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,letterSpacing:"-.5px",marginBottom:3}}>Platform Orders</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>{orders.length} orders across all merchants</p>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginBottom:16}}>
      {[
        {l:"Total",     v:orders.length,                                              c:C.blue},
        {l:"Pending",   v:orders.filter((o:any)=>o.status==="pending").length,        c:C.violet},
        {l:"Submitted", v:orders.filter((o:any)=>o.status==="submitted").length,      c:C.blue},
        {l:"Shipped",   v:orders.filter((o:any)=>o.status==="shipped").length,        c:C.sky},
        {l:"Delivered", v:orders.filter((o:any)=>o.status==="delivered").length,      c:C.green},
        {l:"Commission",v:`$${totalCommission.toFixed(0)}`,                           c:C.amber},
      ].map((s,i)=>(
        <div key={s.l} className={`fu d${i+1}`}
          style={{...card,padding:14,textAlign:"center",cursor:s.l!=="Commission"?"pointer":"default"}}
          onClick={()=>s.l!=="Commission"&&setFilter(s.l==="Total"?"All":s.l.toLowerCase())}>
          <div style={{fontWeight:800,fontSize:20,color:s.c}}>{s.v}</div>
          <div style={{fontSize:11,color:"#7b88aa",marginTop:2}}>{s.l}</div>
        </div>
      ))}
    </div>

    {pendingCount>0&&<div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:12,padding:"12px 16px",marginBottom:14,fontSize:13,color:C.amber,fontWeight:600}}>
      ⚠ {pendingCount} order{pendingCount>1?"s":""} need attention. Update status to keep merchants informed.
    </div>}

    {/* Filter chips */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["All",...STATUSES].map(s=>(
        <button key={s} onClick={()=>setFilter(s)}
          style={{padding:"6px 16px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",
            border:`1.5px solid ${filter===s?C.blue:"rgba(255,255,255,.08)"}`,
            background:filter===s?`${C.blue}18`:"transparent",
            color:filter===s?C.blue:"#7b88aa"}}>{s}
        </button>
      ))}
    </div>

    {loading
      ?<div style={{textAlign:"center",padding:"40px 0",color:"#4e5875"}}>Loading…</div>
      :filtered.length===0
      ?<div style={{...card,padding:40,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:10}}>📦</div>
        <div style={{fontWeight:700,fontSize:15,color:"#7b88aa"}}>No orders found</div>
      </div>
      :<div style={{display:"grid",gap:10}}>
        {filtered.map((o:any,i:number)=>{
          const isOpen=expanded===o.id;
          const estDel=o.estimatedDelivery?.toDate?.();
        
          return(
            <div key={o.id} className={`fu d${Math.min(i%6+1,6)}`} style={{...card,overflow:"hidden",
              border:o.fundsReimbursed?"1px solid rgba(34,197,94,.25)":"1px solid rgba(255,255,255,.08)"}}>

              {/* Header */}
              <div style={{padding:16,cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:o.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:14}}>{o.customer?.name}</span>
                      <SBadge s={o.status}/>
                      {/* Disbursed badge */}
                      {o.fundsReimbursed&&(
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"rgba(34,197,94,.12)",color:C.green,fontFamily:"monospace"}}>
                          💸 PAID OUT
                        </span>
                      )}
                      {/* Dispatch visibility badge */}
                      {o.scheduledDispatchAt&&(()=>{
                        const dispatchMs = o.scheduledDispatchAt?.toDate?.()?.getTime?.()??0;
                        const isPending  = dispatchMs > Date.now();
                        return(
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",
                            borderRadius:99,
                            background:isPending?"rgba(217,119,6,.12)":"rgba(34,197,94,.12)",
                            color:isPending?"#d97706":C.green}}>
                            {isPending
                              ?`🕐 Dispatches ${o.scheduledDispatchAt?.toDate?.().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}`
                              :`✓ Dispatched ${o.scheduledDispatchAt?.toDate?.().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}`}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{fontSize:11,color:"#7b88aa",marginBottom:4}}>{o.storeName} · {o.placedAt?.toDate?.().toLocaleString("en-US", {   month: "short",   day: "numeric",   year: "numeric",   hour: "2-digit",   minute: "2-digit",   hour12: true, })}</div>
                    <StatusPath status={o.status}/>
                    {estDel&&<div style={{fontSize:11,color:C.sky,marginTop:6}}>📦 Est. delivery: {estDel.toLocaleString("en-US", {   month: "short",   day: "numeric",   year: "numeric",   hour: "2-digit",   minute: "2-digit",   hour12: true, })}</div>}
                    {o.reimbursedAt&&<div style={{fontSize:11,color:C.green,marginTop:4}}>
                      ✓ ${(o.reimbursedAmount??0).toFixed(2)} disbursed · {o.reimbursedAt?.toDate?.().toLocaleDateString()}
                    </div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"monospace",fontWeight:800,fontSize:15,marginBottom:2}}>${(o.total??0).toFixed(2)}</div>
                    <div style={{fontSize:11,color:C.amber}}>Fee: ${(o.platformCommission??0).toFixed(2)}</div>
                    <div style={{fontSize:11,color:C.green}}>Merch: +${(o.totalReimbursement??o.merchantEarnings??0).toFixed(2)}</div>
                    <div style={{fontSize:12,color:"#4e5875",marginTop:3}}>{isOpen?"▲":"▼"}</div>
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {isOpen&&(
                <div style={{borderTop:"1px solid rgba(255,255,255,.06)",padding:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
                    {/* Customer */}
                    <div style={{background:"#161e30",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"#4e5875",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Customer</div>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{o.customer?.name}</div>
                      <div style={{fontSize:11,color:"#7b88aa"}}>{o.customer?.email}</div>
                      {o.customer?.phone&&<div style={{fontSize:11,color:"#7b88aa"}}>{o.customer.phone}</div>}
                      {o.customer?.address&&<div style={{fontSize:11,color:"#7b88aa",marginTop:4}}>
                        {o.customer.address.line1}, {o.customer.address.city}, {o.customer.address.country}
                      </div>}
                    </div>

                    {/* Items */}
                    <div style={{background:"#161e30",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"#4e5875",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Items</div>
                      {o.items?.map((it:any,idx:number)=>(
                        <div key={idx} style={{marginBottom:6,paddingBottom:6,borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {(it.productImage||it.imageUrl)?.startsWith?.("http")&&
                                <img src={it.productImage||it.imageUrl} alt={it.productName}
                                  style={{width:36,height:36,borderRadius:6,objectFit:"cover",flexShrink:0}}/>}
                              <span style={{fontSize:12,fontWeight:600}}>{it.productName} ×{it.quantity}</span>
                            </div>
                            <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700}}>${(it.unitPrice*it.quantity).toFixed(2)}</span>
                          </div>
                          {(it.size||it.color)&&<div style={{display:"flex",gap:6}}>
                            {it.size&&it.size!=="One Size"&&<span style={{fontSize:10,background:"rgba(220,38,38,.15)",color:C.blue,borderRadius:4,padding:"1px 6px"}}>Size: {it.size}</span>}
                            {it.color&&<span style={{fontSize:10,background:"rgba(255,255,255,.06)",color:"#7b88aa",borderRadius:4,padding:"1px 6px"}}>Color: {it.color}</span>}
                          </div>}
                        </div>
                      ))}
                      <div style={{display:"flex",justifyContent:"space-between",paddingTop:4}}>
                        <span style={{fontSize:12,fontWeight:700}}>Total</span>
                        <span style={{fontFamily:"monospace",fontWeight:800,fontSize:13}}>${(o.total??0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Financials */}
                    <div style={{background:"#161e30",borderRadius:10,padding:"12px 14px"}}>
                      <div style={{fontSize:10,color:"#4e5875",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Financials</div>
                      {[
                        {l:"Base Cost",    v:`$${(o.totalBaseCost??0).toFixed(2)}`,       c:"#e2e8f8"},
                        {l:"Cust. Pays",   v:`$${(o.customerPayment??0).toFixed(2)}`,     c:"#e2e8f8"},
                        {l:"Platform Fee", v:`$${(o.platformCommission??0).toFixed(2)}`,  c:C.amber},
                        {l:"Merch. Gets",  v:`$${(o.totalReimbursement??0).toFixed(2)}`,  c:C.green},
                        {l:"Net Profit",   v:`$${(o.merchantEarnings??0).toFixed(2)}`,    c:C.green},
                      ].map(r=>(
                        <div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:11,color:"#7b88aa"}}>{r.l}</span>
                          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:r.c}}>{r.v}</span>
                        </div>
                      ))}
                      {/* Disbursement status */}
                      <div style={{marginTop:8,padding:"8px 10px",borderRadius:8,
                        background:o.fundsReimbursed?"rgba(34,197,94,.08)":"rgba(245,158,11,.08)",
                        border:`1px solid ${o.fundsReimbursed?"rgba(34,197,94,.25)":"rgba(245,158,11,.2)"}`}}>
                        <div style={{fontSize:11,fontWeight:700,color:o.fundsReimbursed?C.green:C.amber}}>
                          {o.fundsReimbursed
                            ? `✓ Disbursed $${(o.reimbursedAmount??0).toFixed(2)} on ${o.reimbursedAt?.toDate?.().toLocaleDateString()}`
                            : "⏳ Payment pending delivery confirmation"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Scheduled dispatch date ── */}
                  <div style={{marginBottom:12,padding:"12px 14px",
                    borderRadius:12,
                    background:"rgba(220,38,38,.07)",
                    border:"1px solid rgba(220,38,38,.15)"}}>
                    <div style={{fontSize:11,fontWeight:700,
                      color:"#7b88aa",marginBottom:8,
                      textTransform:"uppercase",letterSpacing:".5px"}}>
                      Scheduled Dispatch Date
                    </div>
                    {o.scheduledDispatchAt&&(
                      <div style={{fontSize:12,color:"#4ade80",fontWeight:600,marginBottom:6}}>
                        ✓ Set: {o.scheduledDispatchAt?.toDate?.().toLocaleString("en-US",{
                          weekday:"short",month:"short",day:"numeric",
                          hour:"2-digit",minute:"2-digit"
                        })}
                      </div>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <input
                        type="datetime-local"
                        value={dispatchDate[o.id]??""}
                        min={new Date().toISOString().slice(0,16)}
                        onChange={e=>setDispatchDate(d=>({...d,[o.id]:e.target.value}))}
                        style={{flex:1,background:"#161e30",
                          border:"1.5px solid rgba(255,255,255,.08)",
                          borderRadius:10,padding:"8px 12px",
                          color:"#e2e8f8",fontSize:13,outline:"none",
                          colorScheme:"dark"}}
                        onFocus={e=>(e.target.style.borderColor="#dc2626")}
                        onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
                      <button
                        onClick={()=>saveDispatchDate(o.id)}
                        disabled={saving===o.id||!dispatchDate[o.id]}
                        style={{padding:"8px 16px",borderRadius:10,border:"none",
                          background:"#dc2626",color:"#fff",
                          fontWeight:700,fontSize:12,cursor:"pointer",
                          opacity:(saving===o.id||!dispatchDate[o.id])?.5:1,
                          flexShrink:0}}>
                        {saving===o.id?"Saving…":"Set Date"}
                      </button>
                    </div>
                  </div>

                  {/* Tracking input */}
                  {(o.status==="submitted"||o.status==="processing")&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:6,textTransform:"uppercase",letterSpacing:".5px"}}>Add Tracking & Mark Shipped</div>
                      <div style={{display:"flex",gap:8}}>
                        <input value={tracking[o.id]??o.trackingNumber??""} onChange={e=>setTracking(t=>({...t,[o.id]:e.target.value}))}
                          placeholder="Enter tracking number…"
                          style={{flex:1,background:"#161e30",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"9px 12px",color:"#e2e8f8",fontSize:13,outline:"none"}}
                          onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
                        <button onClick={()=>handleStatus(o,"shipped",tracking[o.id])} disabled={saving===o.id}
                          style={{padding:"9px 16px",borderRadius:10,border:"none",background:C.blue,color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                          🚚 Mark Shipped
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status action buttons */}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {STATUSES.filter(s=>s!==o.status&&s!=="cancelled"&&s!=="pending").map(s=>(
                      <button key={s} onClick={()=>handleStatus(o,s)} disabled={saving===o.id||o.fundsReimbursed}
                        style={{padding:"7px 14px",borderRadius:9,fontWeight:600,fontSize:12,cursor:o.fundsReimbursed?"not-allowed":"pointer",textTransform:"capitalize",
                          border:`1.5px solid ${s==="delivered"?"rgba(34,197,94,.4)":s==="shipped"?"rgba(56,189,248,.3)":"rgba(255,255,255,.08)"}`,
                          background:s==="delivered"?"rgba(34,197,94,.12)":s==="shipped"?"rgba(56,189,248,.08)":"transparent",
                          color:s==="delivered"?C.green:s==="shipped"?C.sky:"#7b88aa",
                          opacity:saving===o.id||o.fundsReimbursed?.4:1}}>
                        {s==="delivered"?"🎉 Mark Delivered & Pay Merchant":"→ "+s}
                      </button>
                    ))}
                    {o.status!=="cancelled"&&o.status!=="delivered"&&(
                      <button onClick={()=>handleBlock(o)} disabled={saving===o.id}
                        style={{padding:"7px 14px",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",
                          border:"1.5px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.12)",color:C.red,opacity:saving===o.id?.5:1}}>
                        🚫 Cancel & Block Store
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    }
  </div>);
}
