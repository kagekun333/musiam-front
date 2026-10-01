import { NextResponse } from "next/server";
import { clientGrowthEvent, observeClientGrowthEvent, requestGrowthTraffic } from "@/lib/analytics/action.server";
export const runtime="nodejs";
export async function POST(request: Request) {
  if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({ok:false},{status:403});
  if(Number(request.headers.get("content-length")??0)>2048)return NextResponse.json({ok:false},{status:413});
  let input:unknown;
  try {
    const reader=request.body?.getReader();if(!reader)return NextResponse.json({ok:false},{status:400});
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return NextResponse.json({ok:false},{status:413});}chunks.push(value);}
    input=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {return NextResponse.json({ok:false},{status:400});}
  const traffic=requestGrowthTraffic(request);
  if(!clientGrowthEvent(input,traffic))return NextResponse.json({ok:false},{status:400});
  await observeClientGrowthEvent(input,traffic);
  return new NextResponse(null,{status:204});
}
