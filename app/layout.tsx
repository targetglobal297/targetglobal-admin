// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
export const metadata: Metadata = { title:"ShopGrid Admin", description:"Super Admin Portal" };
export default function RootLayout({ children }:{children:React.ReactNode}) {
  return (
    <html lang="en"><body>{children}
      <Toaster position="top-right" toastOptions={{ duration:4000,
        style:{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,
          background:"#101824",color:"#e2e8f8",border:"1px solid rgba(255,255,255,.1)"} }}/>
    </body></html>
  );
}
