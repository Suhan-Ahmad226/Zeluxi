"use client";
import {useEffect} from "react";
export function RecentlyViewedTracker({productId}:{productId:string}){
 useEffect(()=>{try{const key="zelux:recently-viewed";const current=JSON.parse(localStorage.getItem(key)||"[]") as string[];localStorage.setItem(key,JSON.stringify([productId,...current.filter(id=>id!==productId)].slice(0,20)));}catch{}},[productId]);
 return null;
}