'use client';
import { useMemo } from 'react';
import QRCode from '@/vendor/qr/index.js';
export function ContactQR({value}:{value:string}){
 const qr=useMemo(()=>{const q=new QRCode(-1,0);q.addData(value);q.make();const n=q.getModuleCount();let path='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(q.isDark(y,x))path+=`M${x+4} ${y+4}h1v1h-1z`;return {path,size:n+8};},[value]);
 return <svg role="img" aria-label="Scan to open the shared contact card" viewBox={`0 0 ${qr.size} ${qr.size}`} className="contact-qr" shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="white"/><path d={qr.path} fill="#212522"/></svg>;
}
