"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { newGrowthDelivery, recordGrowthClientEvent, type Delivery } from "./client";
import type { GrowthEvent } from "./schema";
export default function GrowthPageView({event="visit",surface="other"}:{event?:"visit"|"work_view"|"product_view";surface?:GrowthEvent["properties"]["surface"]}) {
  const pathname=usePathname();
  const previous=useRef<{path:string|null;delivery:Delivery;sent:boolean}|null>(null);
  useEffect(()=>{
    if(!pathname)return;
    try {
      if(!previous.current||previous.current.path!==pathname)previous.current={path:pathname,delivery:newGrowthDelivery(),sent:false};
    } catch {return;}
    const view=previous.current;
    const record=()=>{if(!view.sent&&document.visibilityState==="visible"){view.sent=true;recordGrowthClientEvent(event,{surface,observation:"page_visible"},view.delivery);}};
    record();document.addEventListener("visibilitychange",record);
    return ()=>document.removeEventListener("visibilitychange",record);
  },[pathname,event,surface]);
  return null;
}
