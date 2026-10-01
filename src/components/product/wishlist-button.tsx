"use client";
import {useState} from "react";import {useRouter} from "next/navigation";
export function WishlistButton({productId}:{productId:string}){
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false); const router=useRouter();
 async function toggle(){setBusy(true);try{const r=await fetch("/api/wishlist",{method:saved?"DELETE":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId})});if(r.status===401){router.push("/login?next="+encodeURIComponent(window.location.pathname));return}if(!r.ok)throw new Error();setSaved(!saved)}finally{setBusy(false)}}
 return <button type="button" aria-label={saved?"Remove from wishlist":"Save to wishlist"} aria-pressed={saved} disabled={busy} onClick={toggle} className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-lg shadow-sm backdrop-blur disabled:opacity-50">{saved?"♥":"♡"}</button>
}