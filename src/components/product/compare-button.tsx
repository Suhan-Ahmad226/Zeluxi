"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const KEY="zelux:compare";
export function CompareButton({productId}:{productId:string}){
  const [selected,setSelected]=useState(false);
  const [count,setCount]=useState(0);
  useEffect(()=>{
    try{const ids=JSON.parse(localStorage.getItem(KEY)||"[]");setSelected(ids.includes(productId));setCount(ids.length)}catch{}
  },[productId]);
  function toggle(e:React.MouseEvent){
    e.preventDefault();e.stopPropagation();
    try{
      const ids=[...new Set(JSON.parse(localStorage.getItem(KEY)||"[]"))] as string[];
      const next=ids.includes(productId)?ids.filter(id=>id!==productId):ids.length>=4?ids: [...ids,productId];
      localStorage.setItem(KEY,JSON.stringify(next));setSelected(next.includes(productId));setCount(next.length);window.dispatchEvent(new Event("zelux:compare"));
    }catch{}
  }
  return <div className="flex items-center gap-2">
    <button type="button" onClick={toggle} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${selected?"border-indigo-300 bg-indigo-50 text-indigo-700":"border-slate-200 bg-white text-slate-600"}`}>{selected?"Compared":"Compare"}</button>
    {count>0&&<Link href={"/compare?ids="+encodeURIComponent(JSON.parse(localStorage.getItem(KEY)||"[]").join(","))} onClick={e=>e.stopPropagation()} className="text-xs font-semibold text-indigo-600">View ({count})</Link>}
  </div>;
}
