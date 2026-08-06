// app/(admin)/chat/page.tsx — with file attachment viewing + admin can also attach
"use client";
import { useState, useEffect, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db, auth, storage } from "@/lib/firebase/client";
import { useChatRooms, useChatMessages, sendAdminMessage } from "@/lib/hooks";

const C = { blue:"#dc2626", green:"#22c55e" };

export default function AdminChatPage(){
  const {data:rooms} = useChatRooms();
  const [activeRoom, setActive] = useState<any>(null);
  const {msgs, loading} = useChatMessages(activeRoom?.id ?? null);
  const [text, setText]       = useState("");
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number|null>(null);
  const [previewFile, setPreviewFile] = useState<{url:string,name:string}|null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const totalUnread = rooms.reduce((a,r) => a+(r.unreadAdmin??0), 0);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  async function send(){
    if (!text.trim() || !activeRoom || sending) return;
    const t = text.trim(); setText(""); setSending(true);
    try { await sendAdminMessage(activeRoom.id, t, auth.currentUser?.uid??"", activeRoom.merchantId??""); }
    catch(e) { console.error(e); }
    setSending(false);
  }

  async function handleFile(file: File){
    if (!activeRoom) return;
    if (file.size > 20*1024*1024) { alert("File must be under 20MB."); return; }
    setSending(true); setUploadProgress(0);
    try {
      const isImage = file.type.startsWith("image/");
      const path = `chat-attachments/${activeRoom.id}/admin_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const task = uploadBytesResumable(ref(storage, path), file);
      const fileUrl = await new Promise<string>((resolve,reject) => {
        task.on("state_changed",
          s => setUploadProgress(Math.round((s.bytesTransferred/s.totalBytes)*100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
      setUploadProgress(null);
      await addDoc(collection(db,"chat_rooms",activeRoom.id,"messages"), {
        text: isImage ? "📷 Sent an image" : `📎 Sent a file: ${file.name}`,
        fileUrl, fileName: file.name,
        fileType: isImage ? "image" : "document",
        senderId: auth.currentUser?.uid??"",
        senderName: "Support Team",
        senderRole: "super_admin",
        read: false, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db,"chat_rooms",activeRoom.id), {
        lastMessage: isImage ? "📷 Image" : `📎 ${file.name}`,
        lastMessageAt: serverTimestamp(),
        unreadMerchant: (activeRoom.unreadMerchant??0)+1,
      });
    } catch(e) { console.error(e); alert("Upload failed."); }
    setSending(false); setUploadProgress(null);
  }

  return(
    <div style={{display:"flex",height:"calc(100vh - 52px)",overflow:"hidden"}}>

      {/* Room list */}
      <div style={{width:270,flexShrink:0,background:"#101624",borderRight:"1px solid rgba(255,255,255,.07)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 16px 12px",borderBottom:"1px solid rgba(255,255,255,.07)",flexShrink:0}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:totalUnread>0?4:0}}>Merchant Chats</div>
          {totalUnread>0&&<div style={{fontSize:12,color:C.blue}}>{totalUnread} unread</div>}
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {rooms.length===0
            ? <div style={{padding:20,textAlign:"center",color:"#4e5875",fontSize:13}}>No conversations yet.</div>
            : rooms.map(room=>(
              <div key={room.id} onClick={()=>setActive(room)}
                style={{padding:"13px 16px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.05)",
                  background:activeRoom?.id===room.id?"rgba(220,38,38,.1)":"transparent",
                  borderLeft:activeRoom?.id===room.id?`3px solid ${C.blue}`:"3px solid transparent",transition:"all .15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:6}}>{room.merchantName}</div>
                  {(room.unreadAdmin??0)>0&&<span style={{background:C.blue,color:"#fff",fontFamily:"monospace",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:99,flexShrink:0}}>{room.unreadAdmin}</span>}
                </div>
                <div style={{fontSize:11,color:"#4e5875",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{room.lastMessage||"No messages yet"}</div>
                <div style={{fontSize:10,color:"#4e5875",marginTop:2}}>{room.lastMessageAt?.toDate?.().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Chat window */}
      {activeRoom ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Header */}
          <div style={{padding:"12px 18px",background:"#101624",borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <div style={{width:34,height:34,borderRadius:9,background:`${C.blue}20`,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace",fontWeight:700,fontSize:11}}>
              {(activeRoom.merchantName??'??').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{activeRoom.merchantName??'Unknown'}</div>
              <div style={{fontSize:11,color:"#7b88aa"}}>{activeRoom.storeName}</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/>
              <span style={{fontSize:11,color:"#7b88aa"}}>Active</span>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 18px",display:"flex",flexDirection:"column",gap:8}}>
            {msgs.length===0&&<div style={{textAlign:"center",padding:"30px 0",color:"#4e5875",fontSize:13}}>No messages yet.</div>}
            {msgs.map(msg => {
              const isAdmin = msg.senderRole === "super_admin";
              const isImage = msg.fileType === "image";
              const isDoc   = msg.fileType === "document";
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:isAdmin?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"72%",minWidth:60}}>
                    {!isAdmin&&<div style={{fontSize:10,color:"#7b88aa",marginBottom:3,paddingLeft:4}}>{msg.senderName}</div>}

                    {/* Image attachment */}
                    {isImage&&msg.fileUrl&&(
                      <div style={{marginBottom:4,borderRadius:12,overflow:"hidden",cursor:"pointer",border:`2px solid ${isAdmin?C.blue:"rgba(255,255,255,.1)"}`}}
                        onClick={()=>setPreviewFile({url:msg.fileUrl,name:msg.fileName})}>
                        <img src={msg.fileUrl} alt={msg.fileName}
                          style={{width:"100%",maxWidth:280,display:"block",maxHeight:220,objectFit:"cover"}}/>
                        <div style={{padding:"6px 10px",background:isAdmin?`${C.blue}20`:"#161e30",fontSize:10,color:"#7b88aa"}}>
                          📷 {msg.fileName} · Click to view full size
                        </div>
                      </div>
                    )}

                    {/* Document attachment */}
                    {isDoc&&msg.fileUrl&&(
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                          background:isAdmin?C.blue:"#1c2640",
                          borderRadius:14,borderBottomRightRadius:isAdmin?4:14,borderBottomLeftRadius:isAdmin?14:4,
                          textDecoration:"none",marginBottom:4}}>
                        <span style={{fontSize:24}}>📄</span>
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#e2e8f8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.fileName}</div>
                          <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>Tap to open ↗</div>
                        </div>
                      </a>
                    )}

                    {/* Text bubble */}
                    {msg.text&&!isImage&&!isDoc&&(
                      <div style={{padding:"10px 14px",borderRadius:14,
                        borderBottomRightRadius:isAdmin?4:14,borderBottomLeftRadius:isAdmin?14:4,
                        background:isAdmin?C.blue:"#1c2640",
                        color:"#e2e8f8",fontSize:13,lineHeight:1.5,
                        boxShadow:"0 1px 4px rgba(0,0,0,.2)",wordBreak:"break-word"}}>
                        {msg.text}
                      </div>
                    )}

                    <div style={{fontSize:10,color:"#4e5875",marginTop:2,
                      textAlign:isAdmin?"right":"left",
                      paddingRight:isAdmin?4:0,paddingLeft:isAdmin?0:4}}>
                      {msg.createdAt?.toDate?.().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                      {isAdmin&&<span style={{marginLeft:4}}>{msg.read?"✓✓":"✓"}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Upload progress */}
          {uploadProgress!==null&&(
            <div style={{padding:"8px 18px",background:"#101624",borderTop:"1px solid rgba(255,255,255,.07)"}}>
              <div style={{fontSize:12,color:C.blue,fontWeight:600,marginBottom:5}}>Uploading… {uploadProgress}%</div>
              <div style={{height:4,background:"rgba(255,255,255,.08)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${uploadProgress}%`,background:C.blue,borderRadius:99,transition:"width .2s"}}/>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div style={{padding:"10px 18px",background:"#101624",borderTop:"1px solid rgba(255,255,255,.07)",display:"flex",gap:10,alignItems:"flex-end",flexShrink:0}}>
            {/* Attach button */}
            <button onClick={()=>fileRef.current?.click()} disabled={sending}
              title="Attach file or screenshot"
              style={{width:40,height:40,borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.05)",color:"#7b88aa",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}
              onMouseEnter={e=>{(e.currentTarget as any).style.borderColor=C.blue;(e.currentTarget as any).style.color=C.blue;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.borderColor="rgba(255,255,255,.1)";(e.currentTarget as any).style.color="#7b88aa";}}>
              📎
            </button>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{display:"none"}}
              onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value="";}}/>

            <textarea value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Type a message or attach a file… (Enter to send)" rows={1}
              style={{flex:1,background:"#1c2640",border:"1.5px solid rgba(255,255,255,.08)",borderRadius:12,padding:"10px 14px",color:"#e2e8f8",fontSize:13,outline:"none",resize:"none",lineHeight:1.5,maxHeight:100,fontFamily:"inherit"}}
              onFocus={e=>(e.target.style.borderColor=C.blue)}
              onBlur={e=>(e.target.style.borderColor="rgba(255,255,255,.08)")}/>
            <button onClick={send} disabled={!text.trim()||sending}
              style={{width:40,height:40,borderRadius:11,border:"none",background:text.trim()?C.blue:"#1c2640",color:"#fff",fontSize:17,cursor:"pointer",flexShrink:0,opacity:text.trim()?1:.4,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {sending
                ? <span style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",display:"inline-block",animation:"spin 1s linear infinite"}}/>
                : "➤"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
          <div style={{fontSize:48}}>💬</div>
          <div style={{fontWeight:700,fontSize:18}}>Select a conversation</div>
          <div style={{fontSize:13,color:"#7b88aa"}}>Choose a merchant from the left panel</div>
        </div>
      )}

      {/* Image lightbox */}
      {previewFile&&(
        <>
          <div onClick={()=>setPreviewFile(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:200,backdropFilter:"blur(4px)"}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:201,maxWidth:"min(90vw,700px)",width:"100%"}}>
            <div style={{background:"#101624",borderRadius:16,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,.6)"}}>
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
                <div style={{fontWeight:700,color:"#e2e8f8",fontSize:14}}>📷 {previewFile.name}</div>
                <button onClick={()=>setPreviewFile(null)} style={{width:28,height:28,borderRadius:7,background:"rgba(255,255,255,.08)",border:"none",color:"#7b88aa",cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div style={{padding:8,maxHeight:"72vh",overflowY:"auto",background:"#0a0f1c"}}>
                <img src={previewFile.url} alt={previewFile.name} style={{width:"100%",borderRadius:8,display:"block"}}/>
              </div>
              <div style={{padding:"12px 16px",display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,.07)"}}>
                <a href={previewFile.url} target="_blank" rel="noopener noreferrer"
                  style={{flex:1,padding:"10px",borderRadius:9,background:C.blue,color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>
                  Open Full Size ↗
                </a>
                <button onClick={()=>setPreviewFile(null)}
                  style={{padding:"10px 18px",borderRadius:9,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#7b88aa",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}
