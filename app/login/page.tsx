"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const I18N = {
  en: { portal: "Internal workspace", heading: "Sign in to continue", google: "Continue with Google", footer_pre: "Access restricted to", footer_suf: "accounts" },
  uk: { portal: "Корпоративний портал", heading: "Увійдіть, щоб продовжити", google: "Увійти через Google", footer_pre: "Доступ лише для", footer_suf: "акаунтів" },
} as const;
type Lang = keyof typeof I18N;

export default function LoginPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [loading, setLoading] = useState(false);
  const t = I18N[lang];

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    let time = 0;
    function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
    function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    type PT = "line" | "area" | "bar";
    interface P { x:number;y:number;w:number;h:number;vx:number;vy:number;type:PT;label:string;points:number[];phase:number;color:string;opacity:number; }
    const LABELS = ["Reputation","Reviews","Mentions","Score","Alerts","Traffic","NPS","Sentiment","Reach","Clicks","Shares","Bounce"];
    const TYPES: PT[] = ["line","area","bar","line","bar","area","line","bar","line","area","bar","area"];
    const ZONES = [[0.01,0.03],[0.55,0.01],[0.78,0.16],[0.80,0.56],[0.54,0.78],[0.01,0.70],[0.14,0.36],[0.30,0.06],[0.62,0.38],[0.08,0.12],[0.38,0.80],[0.68,0.82]];
    const panels: P[] = ZONES.map((z,i)=>({x:z[0]*window.innerWidth,y:z[1]*window.innerHeight,w:rnd(138,215),h:rnd(60,105),vx:rnd(-0.13,0.13),vy:rnd(-0.09,0.09),type:TYPES[i%TYPES.length],label:LABELS[i%LABELS.length],points:Array.from({length:Math.floor(rnd(14,20))},()=>Math.random()),phase:rnd(0,Math.PI*2),color:i%3===0?"220,38,38":"255,255,255",opacity:rnd(0.07,0.20)}));
    interface N { x:number;y:number;vx:number;vy:number;r:number;phase:number; }
    const nodes: N[] = Array.from({length:32},()=>({x:rnd(0,window.innerWidth),y:rnd(0,window.innerHeight),vx:rnd(-0.16,0.16),vy:rnd(-0.16,0.16),r:rnd(0.4,1.4),phase:rnd(0,Math.PI*2)}));

    function rr(x:number,y:number,w:number,h:number,r:number){ctx!.beginPath();ctx!.moveTo(x+r,y);ctx!.lineTo(x+w-r,y);ctx!.arcTo(x+w,y,x+w,y+r,r);ctx!.lineTo(x+w,y+h-r);ctx!.arcTo(x+w,y+h,x+w-r,y+h,r);ctx!.lineTo(x+r,y+h);ctx!.arcTo(x,y+h,x,y+h-r,r);ctx!.lineTo(x,y+r);ctx!.arcTo(x,y,x+r,y,r);ctx!.closePath();}
    function shell(p:P){ctx!.save();ctx!.globalAlpha=p.opacity;rr(p.x,p.y,p.w,p.h,7);ctx!.fillStyle="rgba(255,255,255,0.018)";ctx!.strokeStyle=`rgba(${p.color},0.2)`;ctx!.lineWidth=0.5;ctx!.fill();ctx!.stroke();ctx!.fillStyle=`rgba(${p.color},0.45)`;ctx!.font='500 8px "DM Sans",sans-serif';ctx!.fillText(p.label.toUpperCase(),p.x+8,p.y+11.5);ctx!.restore();}
    function drawLine(p:P,t:number){shell(p);const{x,y,w,h,points,color,opacity}=p;const pad=8,lh=14,pw=w-pad*2,ph=h-pad*2-lh,step=pw/(points.length-1);ctx!.save();ctx!.globalAlpha=opacity*0.9;ctx!.beginPath();ctx!.strokeStyle=`rgba(${color},0.8)`;ctx!.lineWidth=1.1;points.forEach((v,i)=>{const cx=x+pad+i*step,cy=y+pad+lh+ph-v*ph;i===0?ctx!.moveTo(cx,cy):ctx!.lineTo(cx,cy);});ctx!.stroke();const prog=((t+p.phase)%(Math.PI*2))/(Math.PI*2);const fi=prog*(points.length-1),ci=Math.min(Math.floor(fi),points.length-2),fr=fi-ci;const dotX=x+pad+fi*step,dotY=y+pad+lh+ph-(points[ci]+(points[ci+1]-points[ci])*fr)*ph;ctx!.beginPath();ctx!.arc(dotX,dotY,2.8,0,Math.PI*2);ctx!.fillStyle=`rgba(${color},1)`;ctx!.fill();ctx!.restore();}
    function drawArea(p:P){shell(p);const{x,y,w,h,points,color,opacity}=p;const pad=8,lh=14,pw=w-pad*2,ph=h-pad*2-lh,step=pw/(points.length-1),baseY=y+pad+lh+ph;ctx!.save();ctx!.globalAlpha=opacity*0.8;ctx!.beginPath();ctx!.moveTo(x+pad,baseY);points.forEach((v,i)=>ctx!.lineTo(x+pad+i*step,baseY-v*ph));ctx!.lineTo(x+pad+(points.length-1)*step,baseY);ctx!.closePath();ctx!.fillStyle=`rgba(${color},0.1)`;ctx!.fill();ctx!.beginPath();ctx!.strokeStyle=`rgba(${color},0.65)`;ctx!.lineWidth=1;points.forEach((v,i)=>{const cx=x+pad+i*step,cy=baseY-v*ph;i===0?ctx!.moveTo(cx,cy):ctx!.lineTo(cx,cy);});ctx!.stroke();ctx!.restore();}
    function drawBar(p:P,t:number){shell(p);const{x,y,w,h,points,color,opacity}=p;const pad=8,lh=14,pw=w-pad*2,ph=h-pad*2-lh,bw=pw/points.length-2;const prog=((t+p.phase)%(Math.PI*2))/(Math.PI*2);const hl=Math.floor(prog*points.length);ctx!.save();ctx!.globalAlpha=opacity*0.85;points.forEach((v,i)=>{const bx=x+pad+i*(bw+2),bh=v*ph,by=y+pad+lh+ph-bh;rr(bx,by,bw,bh,2);ctx!.fillStyle=`rgba(${color},${i===hl?0.8:0.22+v*0.28})`;ctx!.fill();});ctx!.restore();}

    function draw(){time+=0.007;const W=canvas!.width,H=canvas!.height;ctx!.clearRect(0,0,W,H);for(const p of panels){p.x+=p.vx;p.y+=p.vy;if(p.x+p.w<0)p.x=W;if(p.x>W)p.x=-p.w;if(p.y+p.h<0)p.y=H;if(p.y>H)p.y=-p.h;if(p.type==="line")drawLine(p,time);if(p.type==="area")drawArea(p);if(p.type==="bar")drawBar(p,time);}for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1;}for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<115){ctx!.beginPath();ctx!.strokeStyle=`rgba(220,38,38,${(1-d/115)*0.06})`;ctx!.lineWidth=0.5;ctx!.moveTo(nodes[i].x,nodes[i].y);ctx!.lineTo(nodes[j].x,nodes[j].y);ctx!.stroke();}}for(const n of nodes){const a=0.11+0.06*Math.sin(time+n.phase);ctx!.beginPath();ctx!.arc(n.x,n.y,n.r,0,Math.PI*2);ctx!.fillStyle=`rgba(220,38,38,${a})`;ctx!.fill();}animId=requestAnimationFrame(draw);}
    draw();
    return()=>{cancelAnimationFrame(animId);window.removeEventListener("resize",resize);};
  }, []);

  return (
    <div style={{minHeight:"100vh",backgroundColor:"#080808",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
      <canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 48% 55% at 50% 50%,rgba(8,8,8,0.78) 0%,transparent 100%),radial-gradient(ellipse 100% 100% at 50% 50%,transparent 38%,#080808 78%)",pointerEvents:"none",zIndex:1}}/>
      <div style={{position:"absolute",top:20,right:24,zIndex:20,display:"flex",gap:2,background:"rgba(255,255,255,0.04)",border:"0.5px solid rgba(255,255,255,0.08)",borderRadius:8,padding:3}}>
        {(["en","uk"] as Lang[]).map(l=>(
          <button key={l} onClick={()=>setLang(l)} style={{padding:"4px 10px",borderRadius:5,fontSize:12,fontWeight:500,fontFamily:"inherit",cursor:"pointer",border:"none",background:lang===l?"rgba(255,255,255,0.09)":"transparent",color:lang===l?"#fff":"rgba(255,255,255,0.3)"}}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem",padding:"2.5rem 2.25rem 2rem",width:"100%",maxWidth:360,background:"rgba(10,10,10,0.78)",border:"0.5px solid rgba(255,255,255,0.09)",borderRadius:18,backdropFilter:"blur(28px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/skelar-mark.png" alt="SKELAR" width={32} height={32} style={{objectFit:"contain",display:"block"}}/>
          <span style={{fontSize:16,fontWeight:600,color:"#fff",letterSpacing:"-0.02em"}}>SKELAR Vault</span>
        </div>
        <div style={{width:"100%",height:"0.5px",background:"rgba(255,255,255,0.07)"}}/>
        <div style={{textAlign:"center"}}>
          <p style={{color:"rgba(255,255,255,0.28)",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:500,margin:0}}>{t.portal}</p>
          <h1 style={{color:"#fff",fontSize:22,fontWeight:600,letterSpacing:"-0.03em",marginTop:5,lineHeight:1.2}}>{t.heading}</h1>
        </div>
        <button onClick={handleGoogleLogin} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,width:"100%",padding:"12px 20px",background:loading?"#0e0e0e":"#141414",border:"0.5px solid rgba(255,255,255,0.13)",borderRadius:10,color:loading?"rgba(255,255,255,0.4)":"#fff",fontSize:14,fontWeight:500,fontFamily:"inherit",cursor:loading?"not-allowed":"pointer"}}>
          {loading ? <span>Redirecting...</span> : <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {t.google}
          </>}
        </button>
        <p style={{color:"rgba(255,255,255,0.16)",fontSize:11.5,textAlign:"center",lineHeight:1.5}}>
          {t.footer_pre} <span style={{color:"rgba(255,255,255,0.3)"}}>@skelar.tech</span> {t.footer_suf}
        </p>
      </div>
    </div>
  );
}