import type { AppProps } from "next/app";
import Nav from "@/components/Nav";
import "@/styles/globals.css";
import { UnifrakturCook, Cormorant_Garamond } from "next/font/google";

const gothic = UnifrakturCook({ weight: "700", subsets: ["latin"], variable: "--font-unifraktur" });
const serif = Cormorant_Garamond({ weight: ["400","600"], subsets: ["latin"], variable: "--font-cormorant" });

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${gothic.variable} ${serif.variable} font-serif`}>
      <Nav />
      <Component {...pageProps} />
    </div>
  );
}
