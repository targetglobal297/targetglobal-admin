// app/(admin)/dashboard/page.tsx
"use client";
import { useAllStores, useAllOrders, useAllWallets, useAllWithdrawals,
  useVendors, useProducts, useChatRooms } from "@/lib/hooks";
import Link from "next/link";

const C = { blue:"#dc2626", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  violet:"#a78bfa", sky:"#38bdf8" };

function Stat({ icon, label, value, color, delay=1, href }:
  { icon:string; label:string; value:any; color:string; delay?:number; href?:string }) {
  const el = (
    <div className={`fu d${delay}`} style={{ background:"#101624",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:13, padding:18,
      position:"relative", overflow:"hidden", cursor:href?"pointer":"default" }}>
      <div style={{ width:38, height:38, borderRadius:10, background:color+"22",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:17, marginBottom:12 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:22, letterSpacing:"-.5px", marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:12, color:"#7b88aa", fontWeight:600 }}>{label}</div>
      <div style={{ position:"absolute", bottom:-14, right:-14, width:50, height:50,
        borderRadius:"50%", background:`radial-gradient(circle,${color}20,transparent 70%)` }}/>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration:"none", color:"inherit" }}>{el}</Link> : el;
}

function SBadge({ s }: { s:string }) {
  const m: Record<string,{c:string,bg:string}> = {
    pending:   {c:C.amber,  bg:"rgba(245,158,11,.12)"},
    active:    {c:C.green,  bg:"rgba(34,197,94,.12)"},
    shipped:   {c:C.blue,   bg:"rgba(220,38,38,.12)"},
    delivered: {c:C.green,  bg:"rgba(34,197,94,.12)"},
    cancelled: {c:C.red,    bg:"rgba(239,68,68,.12)"},
    processing:{c:C.amber,  bg:"rgba(245,158,11,.12)"},
    blocked:   {c:C.red,    bg:"rgba(239,68,68,.12)"},
  };
  const st = m[s] ?? {c:"#7b88aa", bg:"rgba(123,136,170,.12)"};
  return <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:600,
    padding:"3px 9px", borderRadius:99, textTransform:"uppercase",
    color:st.c, background:st.bg }}>{s}</span>;
}

export default function Dashboard() {
  const { data:stores   = [] } = useAllStores();
  const { orders        = [] } = useAllOrders();
  const { data:wallets  = [] } = useAllWallets();
  const { data:wds      = [] } = useAllWithdrawals();
  const { data:vendors  = [] } = useVendors();
  const { data:products = [] } = useProducts();
  const { data:rooms    = [] } = useChatRooms();

  const totalBal   = wallets.reduce((a,w) => a + w.usdEquivalent, 0);
  const commission = orders.reduce((a,o) => a + (o.platformCommission??0), 0);
  const pendingWd  = wds.filter(w => w.status==="pending").length;
  const unreadChat = rooms.reduce((a,r) => a + (r.unreadAdmin??0), 0);
  const blocked    = stores.filter(s => s.status==="blocked").length;
  const bar = [18,22,19,28,25,32,30,38,35,42,40,48];
  const maxB = Math.max(...bar);

  return (
    <div>
      <div className="fu" style={{ marginBottom:22 }}>
        <h1 style={{ fontWeight:800, fontSize:22, letterSpacing:"-.5px", marginBottom:3 }}>
          Platform Overview
        </h1>
        <p style={{ color:"#7b88aa", fontSize:13 }}>
          {new Date().toLocaleDateString("en-US",
            { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",
        gap:12, marginBottom:16 }}>
        <Stat delay={1} icon="🏪" label="Merchants"   value={stores.length}             color={C.blue}   href="/merchants"/>
        <Stat delay={2} icon="🛍" label="Products"    value={products.length}           color={C.violet} href="/catalog"/>
        <Stat delay={3} icon="🏭" label="Vendors"     value={vendors.length}            color={C.sky}    href="/vendors"/>
        <Stat delay={4} icon="📦" label="Orders"      value={orders.length}             color={C.green}  href="/orders"/>
        <Stat delay={5} icon="💼" label="Wallet Pool" value={`$${totalBal.toFixed(0)}`} color={C.amber}/>
        <Stat delay={6} icon="⚡" label="Commission"  value={`$${commission.toFixed(2)}`} color={C.green}/>
      </div>

      {/* Alert banners */}
      {(pendingWd>0 || unreadChat>0 || blocked>0) && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
          gap:12, marginBottom:16 }}>
          {pendingWd>0 && (
            <Link href="/withdrawals" style={{ textDecoration:"none", display:"block",
              background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.25)",
              borderRadius:12, padding:"12px 16px" }}>
              <div style={{ fontWeight:700, color:C.amber, fontSize:13 }}>
                ⏳ {pendingWd} withdrawal{pendingWd>1?"s":""} pending
              </div>
              <div style={{ fontSize:11, color:"#7b88aa", marginTop:2 }}>Click to review →</div>
            </Link>
          )}
          {unreadChat>0 && (
            <Link href="/chat" style={{ textDecoration:"none", display:"block",
              background:"rgba(220,38,38,.08)", border:"1px solid rgba(220,38,38,.25)",
              borderRadius:12, padding:"12px 16px" }}>
              <div style={{ fontWeight:700, color:C.blue, fontSize:13 }}>
                💬 {unreadChat} unread message{unreadChat>1?"s":""}
              </div>
              <div style={{ fontSize:11, color:"#7b88aa", marginTop:2 }}>Open Live Chat →</div>
            </Link>
          )}
          {blocked>0 && (
            <Link href="/merchants" style={{ textDecoration:"none", display:"block",
              background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.25)",
              borderRadius:12, padding:"12px 16px" }}>
              <div style={{ fontWeight:700, color:C.red, fontSize:13 }}>
                🚫 {blocked} store{blocked>1?"s":""} blocked
              </div>
              <div style={{ fontSize:11, color:"#7b88aa", marginTop:2 }}>Review now →</div>
            </Link>
          )}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",
        gap:14, marginBottom:16 }}>
        {/* Revenue chart */}
        <div style={{ background:"#101624", border:"1px solid rgba(255,255,255,.08)",
          borderRadius:13, padding:20 }} className="fu d2">
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>Revenue Trend</div>
              <div style={{ fontSize:11, color:"#7b88aa", marginTop:2 }}>12 months</div>
            </div>
            <div style={{ fontWeight:800, fontSize:18, color:C.green }}>
              ${orders.reduce((a,o)=>a+o.total,0).toLocaleString()}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:64 }}>
            {bar.map((v,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", gap:3 }}>
                <div style={{ width:"100%", height:`${(v/maxB)*56}px`,
                  background:i===bar.length-1?C.blue:`${C.blue}30`,
                  borderRadius:"3px 3px 2px 2px", minHeight:3 }}/>
                <div style={{ fontFamily:"monospace", fontSize:8, color:"#4e5875" }}>
                  {"JJASONDJFMAM"[i]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Store status */}
        <div style={{ background:"#101624", border:"1px solid rgba(255,255,255,.08)",
          borderRadius:13, padding:20 }} className="fu d3">
          <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Store Status</div>
          {[
            {l:"Active",    f:"active",    c:C.green},
            {l:"Pending",   f:"pending",   c:C.amber},
            {l:"Blocked",   f:"blocked",   c:C.red},
            {l:"Suspended", f:"suspended", c:"#7b88aa"},
          ].map(s => {
            const n = stores.filter(x=>x.status===s.f).length;
            const pct = stores.length ? Math.round((n/stores.length)*100) : 0;
            return (
              <div key={s.l} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:600 }}>{s.l}</span>
                  <span style={{ fontFamily:"monospace", fontSize:11,
                    color:"#7b88aa" }}>{n} ({pct}%)</span>
                </div>
                <div style={{ height:5, background:"#1c2640", borderRadius:99 }}>
                  <div style={{ height:"100%", width:`${pct}%`,
                    background:s.c, borderRadius:99 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background:"#101624", border:"1px solid rgba(255,255,255,.08)",
        borderRadius:13, padding:20 }} className="fu d4">
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>Recent Orders</div>
          <Link href="/orders" style={{ fontSize:12, color:C.blue,
            textDecoration:"none", fontWeight:600 }}>View all →</Link>
        </div>
        {orders.length === 0 ? (
          <div style={{ textAlign:"center", padding:"20px 0",
            color:"#4e5875", fontSize:13 }}>No orders yet</div>
        ) : orders.slice(0,6).map(o => (
          <div key={o.id} style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", padding:"10px 0",
            borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            <div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>
                {o.customer.name}
              </div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:"#7b88aa" }}>
                {o.storeName} · {o.placedAt?.toDate?.().toLocaleDateString()}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:13 }}>
                ${o.total.toFixed(2)}
              </span>
              <SBadge s={o.status}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
