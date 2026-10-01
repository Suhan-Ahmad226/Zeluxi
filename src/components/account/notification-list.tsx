"use client";
import {useState} from "react";
type Item={id:string;title:string;body:string;readAt:Date|string|null;createdAt:Date|string};
export function NotificationList({items}:{items:Item[]}){
 const [list,setList]=useState(items);
 async function mark(id?:string){const r=await fetch("/api/notifications",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(id?{id}:{all:true})});if(!r.ok)return;setList(x=>x.map(n=>id?(n.id===id?{...n,readAt:new Date().toISOString()}:n):{...n,readAt:new Date().toISOString()}))}
 const unread=list.filter(x=>!x.readAt).length;
 return <div className="mt-6">{unread?<div className="mb-4 flex justify-end"><button type="button" onClick={()=>mark()} className="text-sm font-semibold text-indigo-600">Mark all as read</button></div>:null}<div className="space-y-3">{list.length?list.map(n=><article key={n.id} className={"rounded-2xl border p-5 "+(n.readAt?"bg-white":"bg-indigo-50")}><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{n.title}</p><p className="mt-1 text-sm text-slate-600">{n.body}</p><p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString("en-BD")}</p></div>{!n.readAt?<button type="button" onClick={()=>mark(n.id)} className="shrink-0 text-xs font-semibold text-indigo-600">Read</button>:null}</div></article>):<p className="rounded-2xl border border-dashed p-6 text-slate-600">No notifications.</p>}</div></div>
}