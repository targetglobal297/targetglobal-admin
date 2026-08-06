// app/(admin)/catalog/page.tsx — Full variant support + bulk import
"use client";
import { useState, useRef } from "react";
import { useProducts, useVendors, createProduct, updateProduct, deleteProduct } from "@/lib/hooks";
import { auth } from "@/lib/firebase/client";
import toast from "react-hot-toast";

const C={blue:"#dc2626",green:"#22c55e",amber:"#f59e0b",red:"#ef4444",sky:"#38bdf8",violet:"#a78bfa"};
const CATS=["Electronics & Accessories","Women's Shoes","Men's Shoes","Women's Clothing","Men's Clothing","Women's Bags","Men's Bags","Fitness & Sports","Kitchen & Home","Kids & Baby","Beauty & Skincare","General & Lifestyle"];
const WOMENS_SIZES=["US 5","US 5.5","US 6","US 6.5","US 7","US 7.5","US 8","US 8.5","US 9","US 9.5","US 10","US 10.5","US 11"];
const MENS_SIZES=["US 6","US 6.5","US 7","US 7.5","US 8","US 8.5","US 9","US 9.5","US 10","US 10.5","US 11","US 11.5","US 12","US 13","US 14","US 15"];
const CLOTHING_SIZES=["XS","S","M","L","XL","XXL","XXXL"];
const WAIST_SIZES=["28","29","30","31","32","33","34","36","38","40","42"];
const COMMON_COLORS=["White","Black","Navy","Grey","Beige","Brown","Red","Blue","Green","Pink","Purple","Orange","Yellow","Gold","Silver","Multicolor"];

function getSizesForCategory(cat:string) {
  if(cat.includes("Women's Shoes")) return WOMENS_SIZES;
  if(cat.includes("Men's Shoes")) return MENS_SIZES;
  if(cat.includes("Men's Clothing")) return [...CLOTHING_SIZES,...WAIST_SIZES.map(w=>`W${w}`)];
  if(cat.includes("Clothing")) return CLOTHING_SIZES;
  return ["One Size"];
}

function newVariant(cat:string): any {
  const sizes=getSizesForCategory(cat);
  return { id:`v_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, size:sizes[0], color:"Black", basePrice:0, retailPrice:0, stock:0, sku:"" };
}

// ── Product Detail Modal ──────────────────────────────────────
function ProductModal({p,onClose,onEdit,onDelete}:{p:any;onClose:()=>void;onEdit:()=>void;onDelete:()=>void}){
  const [selVar,setSelVar]=useState(p.variants?.[0]);
  const img=p.images?.[0]?.startsWith("http")?p.images[0]:null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#101624",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,width:"100%",maxWidth:580,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{position:"relative",height:240,background:"#161e30",borderRadius:"20px 20px 0 0",overflow:"hidden",flexShrink:0}}>
          {img?<img src={img} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:80}}>📦</div>}
          <button onClick={onClose} style={{position:"absolute",top:12,right:12,width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.5)",color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          <div style={{position:"absolute",bottom:12,left:12,background:"rgba(0,0,0,.6)",borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700,color:C.sky}}>{p.category}</div>
        </div>
        <div style={{padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16,flexWrap:"wrap"}}>
            <div>
              <div style={{fontWeight:800,fontSize:20,color:"#e2e8f8",marginBottom:4}}>{p.name}</div>
              <div style={{fontSize:13,color:"#7b88aa"}}>{p.vendorName} · SKU: {p.sku}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:900,fontSize:26,color:C.green}}>${selVar?.retailPrice?.toFixed(2)??p.suggestedRetail?.toFixed(2)}</div>
              <div style={{fontSize:12,color:"#4e5875"}}>Base ${selVar?.basePrice?.toFixed(2)??p.basePrice?.toFixed(2)}</div>
            </div>
          </div>

          {p.variants?.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>Select Variant</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {p.variants.map((v:any)=>(
                <div key={v.id} onClick={()=>setSelVar(v)}
                  style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                    border:`1.5px solid ${selVar?.id===v.id?C.blue:"rgba(255,255,255,.1)"}`,
                    background:selVar?.id===v.id?`${C.blue}20`:"transparent",
                    color:selVar?.id===v.id?C.blue:"#7b88aa",
                    opacity:v.stock===0?.4:1}}>
                  {v.size} / {v.color}
                  {v.stock===0&&<span style={{marginLeft:4,fontSize:9,color:C.red}}>OOS</span>}
                </div>
              ))}
            </div>
            {selVar&&<div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{l:"Base Cost",v:`$${selVar.basePrice.toFixed(2)}`,c:"#e2e8f8"},{l:"Retail Price",v:`$${selVar.retailPrice.toFixed(2)}`,c:C.green},{l:"Stock",v:selVar.stock,c:selVar.stock>10?C.green:selVar.stock>0?C.amber:C.red}].map(s=>(
                <div key={s.l} style={{background:"#161e30",borderRadius:9,padding:"10px",textAlign:"center"}}>
                  <div style={{fontFamily:"monospace",fontWeight:800,fontSize:16,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#4e5875",marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>}
          </div>}

          {p.description&&<div style={{fontSize:13,color:"#e2e8f8",lineHeight:1.7,background:"#161e30",borderRadius:10,padding:"12px 14px",marginBottom:16}}>{p.description}</div>}

          {p.tags?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {p.tags.map((t:string)=><span key={t} style={{background:`${C.blue}18`,color:C.blue,borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:600}}>#{t}</span>)}
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
            <button onClick={onEdit} style={{padding:"11px",borderRadius:10,border:`1px solid ${C.blue}`,background:`${C.blue}18`,color:C.blue,fontWeight:700,fontSize:14,cursor:"pointer"}}>✎ Edit</button>
            <button onClick={onDelete} style={{padding:"11px",borderRadius:10,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:C.red,fontWeight:700,fontSize:14,cursor:"pointer"}}>🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Variant Row Editor ────────────────────────────────────────
function VariantRow({v,cat,idx,onChange,onRemove}:{v:any;cat:string;idx:number;onChange:(v:any)=>void;onRemove:()=>void}){
  const sizes=getSizesForCategory(cat);
  const s:React.CSSProperties={background:"#1a2235",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"6px 9px",color:"#e2e8f8",fontSize:12,outline:"none",width:"100%"};
  return(
    <tr style={{borderBottom:"1px solid rgba(255,255,255,.06)"}}>
      <td style={{padding:"8px 6px",width:28,color:"#4e5875",fontSize:11,textAlign:"center"}}>{idx+1}</td>
      <td style={{padding:"8px 6px"}}>
        <select value={v.size} onChange={e=>onChange({...v,size:e.target.value})} style={s}>
          {sizes.map(sz=><option key={sz}>{sz}</option>)}
        </select>
      </td>
      <td style={{padding:"8px 6px"}}>
        <select value={v.color} onChange={e=>onChange({...v,color:e.target.value})} style={s}>
          {COMMON_COLORS.map(c=><option key={c}>{c}</option>)}
        </select>
      </td>
      <td style={{padding:"8px 6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          <span style={{color:"#7b88aa",fontSize:12}}>$</span>
          <input type="number" step="0.01" value={v.basePrice} onChange={e=>onChange({...v,basePrice:parseFloat(e.target.value)||0})} style={{...s,width:80}} placeholder="0.00"/>
        </div>
      </td>
      <td style={{padding:"8px 6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          <span style={{color:"#7b88aa",fontSize:12}}>$</span>
          <input type="number" step="0.01" value={v.retailPrice} onChange={e=>onChange({...v,retailPrice:parseFloat(e.target.value)||0})} style={{...s,width:80,color:C.green}} placeholder="0.00"/>
        </div>
      </td>
      <td style={{padding:"8px 6px"}}>
        <input type="number" value={v.stock} onChange={e=>onChange({...v,stock:parseInt(e.target.value)||0})} style={{...s,width:70}} placeholder="0"/>
      </td>
      <td style={{padding:"8px 6px"}}>
        <input value={v.sku} onChange={e=>onChange({...v,sku:e.target.value})} style={{...s,width:100}} placeholder="SKU-001"/>
      </td>
      <td style={{padding:"8px 6px"}}>
        <button onClick={onRemove} style={{width:26,height:26,borderRadius:6,border:"none",background:"rgba(239,68,68,.12)",color:C.red,cursor:"pointer",fontSize:14}}>×</button>
      </td>
    </tr>
  );
}

export default function CatalogPage(){
  const {data:products,loading}=useProducts();
  const {data:vendors}=useVendors();
  const activeVendors=vendors.filter((v:any)=>v.status==="active");
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<any>(null);
  const [viewing,setViewing]=useState<any>(null);
  const [saving,setSaving]=useState(false);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("All");
  const [importLoading,setImportLoading]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);

  const blank={name:"",description:"",sku:"",vendorId:"",category:CATS[0],tags:"",imageUrl:"",imageUrl2:""};
  const [form,setForm]=useState(blank);
  const [variants,setVariants]=useState<any[]>([]);
  const set=(k:string,v:string)=>setForm(f=>({...f,[k]:v}));

  const filtered=products.filter((p:any)=>{
    const q=!search||p.name.toLowerCase().includes(search.toLowerCase())||p.vendorName?.toLowerCase().includes(search.toLowerCase());
    return catFilter==="All"?q:q&&p.category===catFilter;
  });

  function openEdit(p:any){
    setEditing(p);setViewing(null);
    setForm({name:p.name,description:p.description,sku:p.sku,vendorId:p.vendorId,category:p.category,tags:p.tags?.join(", ")??"",imageUrl:p.images?.[0]??"",imageUrl2:p.images?.[1]??""});
    setVariants(p.variants?.length>0?p.variants:[newVariant(p.category)]);
    setShowForm(true);window.scrollTo({top:0,behavior:"smooth"});
  }

  function resetForm(){setForm(blank);setEditing(null);setShowForm(false);setVariants([]);}

  function addVariant(){setVariants(v=>[...v,newVariant(form.category)]);}
  function removeVariant(id:string){setVariants(v=>v.filter((x:any)=>x.id!==id));}
  function updateVariant(id:string,updated:any){setVariants(v=>v.map((x:any)=>x.id===id?updated:x));}

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault();
    if(!form.name||!form.vendorId){toast.error("Name and vendor required.");return;}
    if(variants.length===0){toast.error("Add at least one variant.");return;}
    setSaving(true);
    const vendor=activeVendors.find((v:any)=>v.id===form.vendorId);
    const data={
      name:form.name,description:form.description,sku:form.sku,
      vendorId:form.vendorId,vendorName:vendor?.name??"",
      category:form.category,tags:form.tags.split(",").map((t:string)=>t.trim()).filter(Boolean),
      images:[form.imageUrl||"📦",form.imageUrl2].filter(Boolean),
      variants,
      basePrice:variants[0]?.basePrice??0,
      suggestedRetail:variants[0]?.retailPrice??0,
      retailPrice:variants[0]?.retailPrice??0,
      stock:variants.reduce((a:number,v:any)=>a+v.stock,0),
      status:"active" as const,addedBy:auth.currentUser?.uid??"",
    };
    try{
      if(editing){await updateProduct(editing.id!,data);toast.success("Product updated!");}
      else{await createProduct(data);toast.success(`"${data.name}" added!`);}
      resetForm();
    }catch{toast.error("Failed to save.");}
    setSaving(false);
  }

  async function handleDelete(p:any){
    if(!confirm(`Delete "${p.name}" and all its variants?`))return;
    setDeleting(p.id!);setViewing(null);
    try{await deleteProduct(p.id!);toast.success("Deleted.");}
    catch{toast.error("Failed.");}
    setDeleting(null);
  }

  async function handleImport(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file) return;
    setImportLoading(true);
    try{
      const text=await file.text();
      const lines=text.split("\n").filter(Boolean);
      if(lines.length<2){toast.error("CSV must have a header row and at least one product.");return;}
      const headers=lines[0].split(",").map((h:string)=>h.trim().replace(/"/g,"").toLowerCase());
      let imported=0;
      for(let i=1;i<lines.length;i++){
        const vals=lines[i].match(/(".*?"|[^,]+)/g)?.map((v:string)=>v.replace(/^"|"$/g,"").trim())??[];
        const row:Record<string,string>={};
        headers.forEach((h:string,idx:number)=>{row[h]=vals[idx]??"";});
        if(!row["product name"]||!row["vendor name"]) continue;
        const vendor=activeVendors.find((v:any)=>v.name.toLowerCase()===row["vendor name"].toLowerCase());
        const variantData:any[]=[{
          id:`v_${Date.now()}_${i}`,
          size:row["size"]||"One Size",
          color:row["color"]||"Black",
          basePrice:parseFloat(row["base price"]||row["base price ($)"]||"0"),
          retailPrice:parseFloat(row["retail price"]||row["retail price ($)"]||"0"),
          stock:parseInt(row["stock"]||"0"),
          sku:row["sku"]||`${row["product name"].slice(0,3).toUpperCase()}-${i}`,
        }];
        await createProduct({
          name:row["product name"],
          description:row["description"]||"",
          sku:row["sku"]||`IMP-${i}`,
          vendorId:vendor?.id??"",
          vendorName:row["vendor name"],
          category:row["category"]||CATS[0],
          tags:row["tags"]?.split(",").map((t:string)=>t.trim()).filter(Boolean)||[],
          images:[row["image url 1"]||row["image url 1 (front)"]||"📦",row["image url 2"]||row["image url 2 (back/variant)"]||""].filter(Boolean),
          variants:variantData,
          basePrice:variantData[0].basePrice,
          suggestedRetail:variantData[0].retailPrice,
          retailPrice:variantData[0].retailPrice,
          stock:variantData[0].stock,
          status:"active",addedBy:auth.currentUser?.uid??"",
        });
        imported++;
      }
      toast.success(`✅ Imported ${imported} products!`);
    }catch(err){toast.error("Import failed. Check CSV format.");}
    setImportLoading(false);
    if(fileRef.current) fileRef.current.value="";
  }

  const inp:React.CSSProperties={width:"100%",background:"#161e30",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:10,padding:"10px 13px",color:"#e2e8f8",fontSize:13,outline:"none",marginBottom:12};
  const lbl:React.CSSProperties={display:"block",fontSize:11,fontWeight:700,color:"#7b88aa",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".5px"};
  const card:React.CSSProperties={background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:14};

  return(<div>
    {viewing&&<ProductModal p={viewing} onClose={()=>setViewing(null)} onEdit={()=>openEdit(viewing)} onDelete={()=>handleDelete(viewing)}/>}

    <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:22,flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontWeight:800,fontSize:22,color:"#e2e8f8",letterSpacing:"-.5px",marginBottom:3}}>Product Catalog</h1>
        <p style={{color:"#7b88aa",fontSize:13}}>{filtered.length} products · {products.reduce((a:number,p:any)=>a+(p.variants?.length??0),0)} total variants</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={handleImport} style={{display:"none"}}/>
        <button onClick={()=>fileRef.current?.click()} disabled={importLoading} style={{background:"#161e30",color:"#7b88aa",border:"1px solid rgba(255,255,255,.1)",borderRadius:9,padding:"8px 16px",fontWeight:600,fontSize:12,cursor:"pointer"}}>
          {importLoading?"Importing…":"📥 Import CSV"}
        </button>
        <button onClick={()=>{resetForm();setVariants([newVariant(form.category)]);setShowForm(!showForm);}} style={{background:C.blue,color:"#fff",border:"none",borderRadius:9,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          {showForm&&!editing?"✕ Cancel":"+ Add Product"}
        </button>
      </div>
    </div>

    {showForm&&<div className="fu" style={{...card,padding:24,marginBottom:20,border:`1px solid ${C.blue}40`}}>
      <div style={{fontWeight:700,fontSize:16,color:C.blue,marginBottom:18}}>{editing?`Edit: ${editing.name}`:"Add New Product"}</div>
      <form onSubmit={handleSubmit}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:12}}>
          <div><label style={lbl}>Product Name *</label><input style={{...inp,marginBottom:0}} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nike Air Force 1" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
          <div><label style={lbl}>SKU</label><input style={{...inp,marginBottom:0}} value={form.sku} onChange={e=>set("sku",e.target.value)} placeholder="NIK-AF1-001" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
          <div><label style={lbl}>Vendor *</label><select style={{...inp,marginBottom:0,cursor:"pointer"}} value={form.vendorId} onChange={e=>set("vendorId",e.target.value)}><option value="">— Select vendor —</option>{activeVendors.map((v:any)=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
          <div><label style={lbl}>Category</label><select style={{...inp,marginBottom:0,cursor:"pointer"}} value={form.category} onChange={e=>{set("category",e.target.value);setVariants([newVariant(e.target.value)]);}}>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div>
            <label style={lbl}>Image 1 — Front / Main</label>
            <input style={{...inp,marginBottom:4,fontSize:11}} value={form.imageUrl} onChange={e=>set("imageUrl",e.target.value)} placeholder="https://images.unsplash.com/..." onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
            {form.imageUrl?.startsWith("http")&&<img src={form.imageUrl} alt="p" style={{width:60,height:60,borderRadius:8,objectFit:"cover"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
          </div>
          <div>
            <label style={lbl}>Image 2 — Back / Variant</label>
            <input style={{...inp,marginBottom:4,fontSize:11}} value={form.imageUrl2} onChange={e=>set("imageUrl2",e.target.value)} placeholder="https://images.unsplash.com/..." onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
            {form.imageUrl2?.startsWith("http")&&<img src={form.imageUrl2} alt="p2" style={{width:60,height:60,borderRadius:8,objectFit:"cover"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
          </div>
        </div>
        <div style={{marginBottom:12}}><label style={lbl}>Description</label><textarea style={{...inp,minHeight:70,resize:"vertical" as const,marginBottom:0}} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Detailed product description…" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>
        <div style={{marginBottom:20}}><label style={lbl}>Tags (comma separated)</label><input style={{...inp,marginBottom:0}} value={form.tags} onChange={e=>set("tags",e.target.value)} placeholder="nike, sneakers, white, classic" onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/></div>

        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <label style={{...lbl,marginBottom:0}}>Variants ({variants.length}) — Size × Color × Price × Stock</label>
            <button type="button" onClick={addVariant} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${C.blue}`,background:`${C.blue}15`,color:C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Variant</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#1a2235"}}>
                  {["#","Size","Color","Base Price","Retail Price","Stock","SKU",""].map(h=>(
                    <th key={h} style={{padding:"8px 6px",textAlign:"left",color:"#7b88aa",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".5px",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v:any,i:number)=>(
                  <VariantRow key={v.id} v={v} cat={form.category} idx={i}
                    onChange={(updated:any)=>updateVariant(v.id,updated)}
                    onRemove={()=>removeVariant(v.id)}/>
                ))}
                {variants.length===0&&<tr><td colSpan={8} style={{padding:"20px",textAlign:"center",color:"#4e5875",fontSize:13}}>No variants — click "+ Add Variant"</td></tr>}
              </tbody>
            </table>
          </div>
          {variants.length>0&&<div style={{display:"flex",gap:16,marginTop:10,padding:"10px 14px",background:"#161e30",borderRadius:9}}>
            {[
              {l:"Variants",v:variants.length},
              {l:"Total Stock",v:variants.reduce((a:number,v:any)=>a+v.stock,0)},
              {l:"Price Range",v:`$${Math.min(...variants.map((v:any)=>v.retailPrice)).toFixed(2)}–$${Math.max(...variants.map((v:any)=>v.retailPrice)).toFixed(2)}`},
            ].map(s=>(
              <div key={s.l}><span style={{fontSize:10,color:"#4e5875"}}>{s.l}: </span><span style={{fontSize:12,fontWeight:700,color:"#e2e8f8"}}>{s.v}</span></div>
            ))}
          </div>}
        </div>

        <div style={{display:"flex",gap:10}}>
          <button type="submit" disabled={saving} style={{background:saving?"#2d3a6b":C.blue,color:"#fff",border:"none",borderRadius:10,padding:"11px 24px",fontWeight:700,fontSize:13,cursor:saving?"not-allowed":"pointer",opacity:saving?.6:1}}>{saving?"Saving…":editing?"Update Product":"Add to Catalog"}</button>
          <button type="button" onClick={resetForm} style={{background:"transparent",color:"#7b88aa",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"11px 22px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </form>
    </div>}

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, vendors…" style={{flex:"1 1 200px",background:"#101624",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"9px 14px",color:"#e2e8f8",fontSize:13,outline:"none"}} onFocus={e=>(e.target.style.borderColor=C.blue)} onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {["All",...CATS].map(c=>(
          <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"7px 13px",borderRadius:99,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${catFilter===c?C.blue:"rgba(255,255,255,.08)"}`,background:catFilter===c?`${C.blue}18`:"transparent",color:catFilter===c?C.blue:"#7b88aa",whiteSpace:"nowrap"}}>{c==="All"?"All Categories":c}</button>
        ))}
      </div>
    </div>

    {loading?<div style={{textAlign:"center",padding:"60px 0",color:"#4e5875"}}>Loading catalog…</div>:
    filtered.length===0?<div style={{...card,padding:60,textAlign:"center"}}>
      <div style={{fontSize:48,marginBottom:14}}>📦</div>
      <div style={{fontWeight:700,fontSize:18,color:"#e2e8f8",marginBottom:6}}>{search?"No products match":"Catalog is empty"}</div>
      <div style={{fontSize:13,color:"#7b88aa",marginBottom:20}}>Add products manually or import from CSV/Excel.</div>
      <button onClick={()=>{resetForm();setVariants([newVariant(CATS[0])]);setShowForm(true);}} style={{background:C.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontWeight:700,fontSize:14,cursor:"pointer"}}>+ Add First Product</button>
    </div>:(
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
        {filtered.map((p:any)=>{
          const img1=p.images?.[0]?.startsWith("http")?p.images[0]:null;
          const img2=p.images?.[1]?.startsWith("http")?p.images[1]:null;
          const minPrice=p.variants?.length>0?Math.min(...p.variants.map((v:any)=>v.retailPrice)):p.suggestedRetail??0;
          const maxPrice=p.variants?.length>0?Math.max(...p.variants.map((v:any)=>v.retailPrice)):p.suggestedRetail??0;
          const totalStock=p.variants?.reduce((a:number,v:any)=>a+v.stock,0)??p.stock??0;
          return(
            <div key={p.id} style={{...card,overflow:"hidden",cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 32px rgba(0,0,0,.4)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
              <div onClick={()=>setViewing(p)} style={{position:"relative",height:180,background:"#161e30",overflow:"hidden"}}>
                {img1?<img src={img1} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:64}}>📦</div>}
                <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,.6)",borderRadius:99,padding:"3px 10px",fontSize:9,fontWeight:700,color:C.sky}}>{p.category}</div>
                <div style={{position:"absolute",top:10,right:10,background:totalStock>10?"rgba(34,197,94,.3)":totalStock>0?"rgba(245,158,11,.3)":"rgba(239,68,68,.3)",borderRadius:99,padding:"3px 10px",fontSize:9,fontWeight:700,color:totalStock>10?C.green:totalStock>0?C.amber:C.red}}>{totalStock} in stock</div>
                {p.variants?.length>0&&<div style={{position:"absolute",bottom:10,left:10,background:"rgba(0,0,0,.6)",borderRadius:99,padding:"3px 10px",fontSize:9,fontWeight:700,color:"#e2e8f8"}}>{p.variants.length} variants</div>}
              </div>
              <div style={{padding:"14px 14px 10px"}} onClick={()=>setViewing(p)}>
                <div style={{fontWeight:700,fontSize:14,color:"#e2e8f8",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{fontSize:11,color:"#7b88aa",marginBottom:10}}>{p.vendorName}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontWeight:900,fontSize:16,color:C.green}}>
                      {minPrice===maxPrice?`$${minPrice.toFixed(2)}`:`$${minPrice.toFixed(2)}–$${maxPrice.toFixed(2)}`}
                    </div>
                    <div style={{fontSize:10,color:"#4e5875"}}>Base from ${p.variants?.length>0?Math.min(...p.variants.map((v:any)=>v.basePrice)).toFixed(2):p.basePrice?.toFixed(2)}</div>
                  </div>
                  {img2&&<div style={{width:36,height:36,borderRadius:6,overflow:"hidden",flexShrink:0}}>
                    <img src={img2} alt="v2" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>}
                </div>
              </div>
              <div style={{padding:"0 14px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <button onClick={e=>{e.stopPropagation();openEdit(p);}} style={{padding:"7px",borderRadius:8,border:"1px solid rgba(255,255,255,.08)",background:"transparent",color:"#7b88aa",fontSize:12,fontWeight:600,cursor:"pointer"}}>✎ Edit</button>
                <button onClick={e=>{e.stopPropagation();handleDelete(p);}} disabled={deleting===p.id} style={{padding:"7px",borderRadius:8,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.06)",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer",opacity:deleting===p.id?.5:1}}>{deleting===p.id?"…":"🗑 Delete"}</button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>);
}
