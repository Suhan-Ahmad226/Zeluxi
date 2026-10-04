import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="pb-16 sm:pb-0">{children}</div>
      <Footer />
    </>
  );
}
