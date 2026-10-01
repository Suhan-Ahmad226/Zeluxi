"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const KEY="zelux:compare";
export function CompareButton({productId}:{productId:string}){
 const [selected,setSelected]=useState(false); const [ids,setIds]=useState<string[]>([]);
 useEffect(()=>{try{const current=JSON.parse(localStorage.getItem(KEY)||"[]");setIds(Array.isArray(current)?current:[])}catch{}},[]);
 useEffect(()=>{const sync=()=>{try{const current=JSON.parse(localStorage.getItem(KEY)||"[]");const next=Array.isArray(current)?current:[];setIds(next);setSelected(next.includes(productId))}catch{}};window.addEventListener("zelux:compare",sync);return()=>window.removeEventListener("zelux:compare",sync)},[productId]);
 function toggle(e:React.MouseEvent){e.preventDefault();e.stopPropagation();try{const current=Array.isArray(JSON.parse(localStorage.getItem(KEY)||"[]"))?JSON.parse(localStorage.getItem(KEY)||"[]") as string[]:[];const next=current.includes(productId)?current.filter(id=>id!==productId):current.length>=4?current:[...current,productId];localStorage.setItem(KEY,JSON.stringify(next));setIds(next);setSelected(next.includes(productId));window.dispatchEvent(new Event("zelux:compare"))}catch{}}
 return <div className="flex items-center gap-2"><button type="button" onClick={toggle} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${selected?"border-indigo-300 bg-indigo-50 text-indigo-700":"border-slate-200 bg-white text-slate-600"}`}>{selected?"Compared":"Compare"}</button>{ids.length>0&&<Link href={"/compare?ids="+encodeURIComponent(ids.join(","))} onClick={e=>e.stopPropagation()} className="text-xs font-semibold text-indigo-600">View ({ids.length})</Link>}</div>;
}