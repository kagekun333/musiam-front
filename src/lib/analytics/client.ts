import type { GrowthEvent } from "./schema";
export type ClientGrowthEvent = "visit"|"work_view"|"product_view"|"cta_clicked"|"work_action"|"listen_link_opened"|"read_open_action";
export type ClientProperties = Omit<GrowthEvent["properties"],"trafficClass">;
export type Delivery = {id:string;createdAt:number};
export function newGrowthDelivery(): Delivery { return {id:crypto.randomUUID(),createdAt:Date.now()}; }
export function recordGrowthClientEvent(event: ClientGrowthEvent,properties:ClientProperties,delivery?:Delivery):void {
  try {
    const body=JSON.stringify({event,properties,delivery:delivery??newGrowthDelivery()});
    void fetch("/api/analytics/event",{method:"POST",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>undefined);
  } catch { /* navigation and UI continue if analytics is unavailable */ }
}
type LinkClick = {currentTarget:HTMLAnchorElement;button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean;isTrusted:boolean;defaultPrevented:boolean;preventDefault():void};
export function observeGrowthWorkLink(event: LinkClick,kind: NonNullable<GrowthEvent["properties"]["actionKind"]>,surface:NonNullable<GrowthEvent["properties"]["surface"]>):void {
  try {
    const delivery=newGrowthDelivery();
    recordGrowthClientEvent("cta_clicked",{actionKind:kind,surface,observation:"anchor_click"},delivery);
    recordGrowthClientEvent("work_action",{actionKind:kind,surface,observation:"anchor_click"},delivery);
    // Native modified clicks retain their behavior; their opened context is unobserved.
    if(event.defaultPrevented||!event.isTrusted||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||kind==="buy")return;
    const href=event.currentTarget.href;
    if(!/^https?:/i.test(href)||event.currentTarget.target!=="_blank")return;
    // Create an observable blank context, sever opener before external navigation,
    // and retain noreferrer. This proves a context opened, not destination load/playback.
    const opened=window.open("about:blank","_blank");if(!opened)return;
    try {
      opened.opener=null;
      const meta=opened.document.createElement("meta");meta.name="referrer";meta.content="no-referrer";opened.document.head.appendChild(meta);
      const link=opened.document.createElement("a");link.href=href;link.rel="noopener noreferrer";link.target="_self";opened.document.body.appendChild(link);link.click();
      event.preventDefault();
      recordGrowthClientEvent(kind==="listen"?"listen_link_opened":"read_open_action",{actionKind:kind,surface,observation:"browser_context_created"},delivery);
    } catch {opened.close();}
  } catch { /* original native link remains available */ }
}
