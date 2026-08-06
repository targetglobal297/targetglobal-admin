// app/(admin)/place-order/page.tsx — Data table layout, NO deduction on placement
"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { placeAdminOrder } from "@/lib/hooks";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444",violet:"#a78bfa"};

const COUNTRIES=["United States","United Kingdom","Canada","Australia","UAE","Saudi Arabia","Nigeria","Kenya","India","Germany","France","Singapore","South Africa","Malaysia","Ghana","Egypt","Jordan","Pakistan","Turkey","Brazil","Mexico","Philippines","Indonesia","Other"];

interface CartItem {
  productId:string; productName:string; productImage:string;
  variantId:string; size:string; color:string;
  unitPrice:number; basePrice:number; quantity:number;
}

export default function PlaceOrderPage(){
  const [stores,setStores]   = useState<any[]>([]);
  const [storeId,setStoreId] = useState("");
  const [store,setStore]     = useState<any>(null);
  const [products,setProducts] = useState<any[]>([]);
  const [loadingP,setLoadingP] = useState(false);
  const [cart,setCart]       = useState<CartItem[]>([]);
  const [selVariant,setSelVariant] = useState<Record<string,string>>({});
  const [selQty,setSelQty]   = useState<Record<string,number>>({});
  const [notes,setNotes]     = useState("");
  const [placing,setPlacing] = useState(false);
  const [search,setSearch]   = useState("");
  const [customer,setCustomer] = useState({name:"",email:"",phone:"",line1:"",city:"",state:"",zip:"",country:"United States"});
  const setC=(k:string,v:string)=>setCustomer(c=>({...c,[k]:v}));

  // Load stores
  useEffect(()=>{
    getDocs(query(collection(db,"stores"),where("status","==","active")))
      .then(s=>setStores(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[]);

  // Load store products when store selected
  async function loadStore(sid:string){
    setStoreId(sid);
    setCart([]);setSelVariant({});setSelQty({});
    if(!sid){setStore(null);setProducts([]);return;}
    const s=stores.find(x=>x.id===sid);
    setStore(s??null);
    setLoadingP(true);
    const sp=await getDocs(query(collection(db,"store_products"),where("storeId","==",sid),where("isVisible","==",true)));
    const prods=sp.docs.map(d=>({id:d.id,...d.data()}));
    // Fetch full product details for variants
    const full:any[]=[];
    for(const p of prods){
      const pDoc=await getDocs(query(collection(db,"products"),where("__name__","==",(p as any).productId),limit(1)));
      if(!pDoc.empty){
        full.push({...p,...pDoc.docs[0].data(),storeProductId:p.id,productDocId:pDoc.docs[0].id});
      } else {
        full.push(p);
      }
    }
    setProducts(full);
    setLoadingP(false);
  }

  function getSelectedVariant(p:any){
    const varId=selVariant[p.id];
    if(!varId&&p.variants?.length>0) return p.variants[0];
    return p.variants?.find((v:any)=>v.id===varId)??p.variants?.[0];
  }

  function addToCart(p:any){
    const v=getSelectedVariant(p);
    if(!v){toast.error("No variant available.");return;}
    const qty=selQty[p.id]||1;
    const existing=cart.find(c=>c.productId===p.productId&&c.variantId===v.id);
    if(existing){
      setCart(c=>c.map(x=>x.productId===p.productId&&x.variantId===v.id?{...x,quantity:x.quantity+qty}:x));
    } else {
      setCart(c=>[...c,{
        productId:p.productId||p.id,
        productName:p.productName||p.name,
        productImage:p.productImage||p.images?.[0]||"📦",
        variantId:v.id,size:v.size,color:v.color,
        unitPrice:v.retailPrice??p.retailPrice??0,
        basePrice:v.basePrice??p.basePrice??0,
        quantity:qty,
      }]);
    }
    toast.success(`Added ${p.productName||p.name} (${v.size}/${v.color})`);
  }

  function removeFromCart(idx:number){setCart(c=>c.filter((_,i)=>i!==idx));}
  function updateCartQty(idx:number,qty:number){setCart(c=>c.map((x,i)=>i===idx?{...x,quantity:Math.max(1,qty)}:x));}

  const subtotal=cart.reduce((a,i)=>a+i.unitPrice*i.quantity,0);
  const baseCost=cart.reduce((a,i)=>a+i.basePrice*i.quantity,0);

  async function handlePlace(){
    if(!storeId){toast.error("Select a merchant store.");return;}
    if(cart.length===0){toast.error("Add at least one product.");return;}
    if(!customer.name||!customer.email){toast.error("Customer name and email are required.");return;}
    if(!customer.line1||!customer.city||!customer.country){toast.error("Complete the delivery address.");return;}
    setPlacing(true);
    try{
      await placeAdminOrder({
        storeId,merchantId:store.merchantId,storeName:store.storeName,
        adminId:auth.currentUser?.uid??"",
        customer:{name:customer.name,email:customer.email,phone:customer.phone,
          address:{line1:customer.line1,city:customer.city,state:customer.state,zip:customer.zip,country:customer.country}},
        items:cart,notes,
      });
      toast.success(`✅ Order placed on ${store.storeName}! No funds deducted — merchant will submit when ready.`);
      setCart([]);setNotes("");setCustomer({name:"",email:"",phone:"",line1:"",city:"",state:"",zip:"",country:"United States"});
    }catch{toast.error("Failed to place order.");}
    setPlacing(false);
  }

  const filtered=products.filter(p=>!search||(p.productName||p.name||"").toLowerCase().includes(search.toLowerCase())||(p.vendorName||"").toLowerCase().includes(search.toLowerCase()));

  const inp:React.CSSProperties={width:"100%",background:"#161e30",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,padding:"9px 12px",color:"#e2e8f8",fontSize:13,outline:"none"};
  const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".5px"};
  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14,marginBottom:14};

  return(<div style={{maxWidth:1100,margin:"0 auto"}}>
    <div className="fu" style={{marginBottom:22}}>
      <h1 style={{fontWeight:800,fontSize:22,color:"#e2e8f8",letterSpacing:"-.5px",marginBottom:4}}>Place Order</h1>
      <p style={{color:"#7b88aa",fontSize:13}}>Place orders on merchant stores · No funds deducted · Merchant submits when ready</p>
    </div>

    {/* Info banner */}
    <div style={{background:"rgba(220,38,38,.08)",border:"1px solid rgba(220,38,38,.2)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:20}}>ℹ️</span>
      <div style={{fontSize:13,color:"#7b88aa",lineHeight:1.6}}>
        <strong style={{color:"#e2e8f8"}}>Admin Note:</strong> Orders placed here appear on the merchant's store as regular customer orders. Merchants do not know they come from admin. Funds are only deducted when the merchant clicks <strong style={{color:C.green}}>"Submit Order"</strong>.
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
      {/* LEFT — Store + Products */}
      <div>
        {/* Store selector */}
        <div style={{...card,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"#e2e8f8",marginBottom:12}}>1. Select Merchant Store</div>
          <select value={storeId} onChange={e=>loadStore(e.target.value)} style={{...inp,cursor:"pointer"}}>
            <option value="">— Choose a store —</option>
            {stores.map(s=><option key={s.id} value={s.id}>{s.storeName} · {s.country}</option>)}
          </select>
          {store&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
            {[
              {l:"Plan",      v:(store.plan??"starter").toUpperCase(),    c:C.violet},
              {l:"Products",  v:`${products.length}`,                      c:C.blue},
              {l:"Commission",v:`${((store.commissionRate??0.03)*100).toFixed(1)}%`,c:C.amber},
            ].map(s=>(
              <div key={s.l} style={{background:"#161e30",borderRadius:9,padding:"10px",textAlign:"center"}}>
                <div style={{fontWeight:800,fontSize:16,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"#4e5875",marginTop:1}}>{s.l}</div>
              </div>
            ))}
          </div>}
        </div>

        {/* Product data table */}
        {storeId&&<div style={{...card,padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{fontWeight:700,fontSize:14,color:"#e2e8f8"}}>2. Select Products</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…" style={{...inp,width:"auto",flex:"0 0 200px",padding:"6px 10px",fontSize:12}} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
          </div>
          {loadingP?<div style={{padding:40,textAlign:"center",color:"#4e5875"}}>Loading products…</div>:
          filtered.length===0?<div style={{padding:40,textAlign:"center",color:"#4e5875"}}>No products in this store.</div>:(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"#0d1120",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                    {["Product","Variant","Qty","Price",""].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#7b88aa",textTransform:"uppercase" as const,letterSpacing:".5px",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p,i)=>{
                    const selV=getSelectedVariant(p);
                    const inCart=cart.some(c=>c.productId===(p.productId||p.id)&&c.variantId===selV?.id);
                    const img=p.productImage?.startsWith("http")?p.productImage:p.images?.[0]?.startsWith("http")?p.images[0]:null;
                    return(
                      <tr key={p.id} style={{borderBottom:"1px solid rgba(255,255,255,.04)",background:i%2===0?"transparent":"rgba(255,255,255,.01)",transition:"background .15s"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(220,38,38,.05)")}
                        onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)")}>
                        {/* Product */}
                        <td style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:44,height:44,borderRadius:8,overflow:"hidden",background:"#161e30",flexShrink:0}}>
                              {img?<img src={img} alt={p.productName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📦</div>}
                            </div>
                            <div style={{minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:13,color:"#e2e8f8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>{p.productName||p.name}</div>
                              <div style={{fontSize:10,color:"#4e5875"}}>{p.vendorName}</div>
                            </div>
                          </div>
                        </td>
                        {/* Variant selector */}
                        <td style={{padding:"10px 14px"}}>
                          {p.variants?.length>0?(
                            <select value={selVariant[p.id]||p.variants[0]?.id} onChange={e=>setSelVariant(v=>({...v,[p.id]:e.target.value}))}
                              style={{background:"#1a2235",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"5px 8px",color:"#e2e8f8",fontSize:11,outline:"none",cursor:"pointer",minWidth:130}}>
                              {p.variants.map((v:any)=>(
                                <option key={v.id} value={v.id} disabled={v.stock===0}>
                                  {v.size} / {v.color} · ${v.retailPrice?.toFixed(2)}{v.stock===0?" (OOS)":""}
                                </option>
                              ))}
                            </select>
                          ):<span style={{fontSize:11,color:"#4e5875"}}>No variants</span>}
                        </td>
                        {/* Qty */}
                        <td style={{padding:"10px 14px"}}>
                          <input type="number" min={1} max={selV?.stock||99} value={selQty[p.id]||1}
                            onChange={e=>setSelQty(q=>({...q,[p.id]:Math.max(1,parseInt(e.target.value)||1)}))}
                            style={{width:56,background:"#1a2235",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"5px 8px",color:"#e2e8f8",fontSize:12,outline:"none",textAlign:"center"}}/>
                        </td>
                        {/* Price */}
                        <td style={{padding:"10px 14px"}}>
                          <div style={{fontFamily:"monospace",fontWeight:700,fontSize:14,color:C.green}}>${(selV?.retailPrice??p.retailPrice??0).toFixed(2)}</div>
                          <div style={{fontSize:10,color:"#4e5875"}}>Base ${(selV?.basePrice??p.basePrice??0).toFixed(2)}</div>
                        </td>
                        {/* Add button */}
                        <td style={{padding:"10px 14px"}}>
                          <button onClick={()=>addToCart(p)}
                            style={{padding:"7px 14px",borderRadius:8,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",
                              background:inCart?`${C.green}20`:C.blue,color:inCart?C.green:"#fff",whiteSpace:"nowrap"}}>
                            {inCart?"✓ Added":"+ Add"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>}

        {/* Customer details */}
        {cart.length>0&&<div style={{...card,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"#e2e8f8",marginBottom:14}}>3. Customer Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Full Name *</label><input style={{...inp}} value={customer.name} onChange={e=>setC("name",e.target.value)} placeholder="Jane Smith" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>Email *</label><input type="email" style={{...inp}} value={customer.email} onChange={e=>setC("email",e.target.value)} placeholder="jane@email.com" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>Phone</label><input style={{...inp}} value={customer.phone} onChange={e=>setC("phone",e.target.value)} placeholder="+1 555 000 0000" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>Country *</label><select style={{...inp,cursor:"pointer"}} value={customer.country} onChange={e=>setC("country",e.target.value)}>{COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div style={{gridColumn:"1/-1"}}><label style={lbl}>Address Line 1 *</label><input style={{...inp}} value={customer.line1} onChange={e=>setC("line1",e.target.value)} placeholder="123 Main Street" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>City *</label><input style={{...inp}} value={customer.city} onChange={e=>setC("city",e.target.value)} placeholder="New York" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>State / Province</label><input style={{...inp}} value={customer.state} onChange={e=>setC("state",e.target.value)} placeholder="NY" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
            <div><label style={lbl}>ZIP / Postal Code</label><input style={{...inp}} value={customer.zip} onChange={e=>setC("zip",e.target.value)} placeholder="10001" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
          </div>
          <div style={{marginTop:12}}><label style={lbl}>Notes (optional)</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any special instructions…" style={{...inp,minHeight:60,resize:"vertical" as const}} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
        </div>}
      </div>

      {/* RIGHT — Order summary */}
      <div style={{position:"sticky",top:70}}>
        <div style={{...card,padding:18}}>
          <div style={{fontWeight:700,fontSize:14,color:"#e2e8f8",marginBottom:14}}>Order Summary</div>
          {cart.length===0?<div style={{textAlign:"center",padding:"28px 0",color:"#4e5875",fontSize:13}}>
            <div style={{fontSize:32,marginBottom:8}}>🛒</div>
            Add products from the table
          </div>:(
            <>
              {/* Cart items */}
              <div style={{maxHeight:320,overflowY:"auto",marginBottom:14}}>
                {cart.map((item,i)=>{
                  const img=item.productImage?.startsWith("http")?item.productImage:null;
                  return(
                    <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
                      <div style={{width:40,height:40,borderRadius:7,overflow:"hidden",background:"#161e30",flexShrink:0}}>
                        {img?<img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📦</div>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:"#e2e8f8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.productName}</div>
                        <div style={{fontSize:10,color:"#7b88aa",marginBottom:4}}>{item.size} · {item.color}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <input type="number" min={1} value={item.quantity} onChange={e=>updateCartQty(i,parseInt(e.target.value)||1)}
                            style={{width:44,background:"#1a2235",border:"1px solid rgba(255,255,255,.08)",borderRadius:5,padding:"3px 6px",color:"#e2e8f8",fontSize:11,outline:"none",textAlign:"center"}}/>
                          <span style={{fontSize:11,color:"#4e5875"}}>× ${item.unitPrice.toFixed(2)}</span>
                          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.green,marginLeft:"auto"}}>${(item.unitPrice*item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <button onClick={()=>removeFromCart(i)} style={{background:"transparent",border:"none",color:"#4e5875",cursor:"pointer",fontSize:14,padding:"0 2px",alignSelf:"flex-start"}}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Pricing breakdown */}
              <div style={{background:"#161e30",borderRadius:10,padding:12,marginBottom:14}}>
                {[
                  {l:"Items",          v:`${cart.reduce((a,i)=>a+i.quantity,0)}`},
                  {l:"Subtotal",       v:`$${subtotal.toFixed(2)}`},
                  {l:"Base Cost",      v:`$${baseCost.toFixed(2)}`},
                  {l:"Est. Profit",    v:`$${(subtotal-baseCost).toFixed(2)}`},
                ].map(r=>(
                  <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
                    <span style={{fontSize:12,color:"#7b88aa"}}>{r.l}</span>
                    <span style={{fontFamily:"monospace",fontSize:12,fontWeight:600,color:r.l==="Est. Profit"?C.green:"#e2e8f8"}}>{r.v}</span>
                  </div>
                ))}
                <div style={{borderTop:"1px solid rgba(255,255,255,.08)",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,color:"#e2e8f8"}}>Total</span>
                  <span style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:C.blue}}>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Info note */}
              <div style={{background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:9,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#7b88aa",lineHeight:1.6}}>
                <strong style={{color:C.green}}>No funds deducted now.</strong> Funds are only deducted when the merchant clicks Submit Order.
              </div>

              <button onClick={handlePlace} disabled={placing||cart.length===0||!customer.name||!customer.email}
                style={{width:"100%",padding:"13px",borderRadius:11,border:"none",
                  background:placing||!customer.name?`${C.blue}50`:`linear-gradient(135deg,${C.blue},${C.violet})`,
                  color:"#fff",fontWeight:700,fontSize:15,cursor:placing?"not-allowed":"pointer",opacity:placing?.7:1}}>
                {placing?"Placing Order…":"📦 Place Order"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </div>);
}
