import type {Metadata,Viewport} from "next";
import {Inter,Noto_Sans_Bengali} from "next/font/google";
import "./globals.css";
const inter=Inter({subsets:["latin"],variable:"--font-inter",display:"swap"});
const bengali=Noto_Sans_Bengali({subsets:["bengali"],variable:"--font-bengali",display:"swap"});
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"https://zelux.vercel.app";
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:{default:"Zelux — Online Shopping in Bangladesh",template:"%s | Zelux"},description:"Shop quality products online in Bangladesh with transparent BDT pricing, secure checkout, COD and reliable delivery.",applicationName:"Zelux",keywords:["Zelux","online shopping Bangladesh","ecommerce Bangladesh","buy online Bangladesh","COD Bangladesh"],authors:[{name:"Zelux"}],creator:"Zelux",publisher:"Zelux",alternates:{canonical:"/"},openGraph:{type:"website",siteName:"Zelux",locale:"en_BD",title:"Zelux — Online Shopping in Bangladesh",description:"Quality products, secure checkout, COD and reliable delivery across Bangladesh.",url:"/"},twitter:{card:"summary_large_image",title:"Zelux — Online Shopping in Bangladesh",description:"Shop online in Bangladesh with Zelux."},robots:{index:true,follow:true,max-image-preview:"large",max-snippet:-1,max-video-preview:-1}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#4F46E5"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="bn"><body className={`${inter.variable} ${bengali.variable}`}>{children}</body></html>}