import Link from "next/link";
import { InstallApp } from "@/components/InstallApp";
import { BottomNav, TopNav } from "@/components/SiteNav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="font-serif text-lg font-semibold text-brand">
            JRF Commerce <span className="text-muted font-normal">· Code 08</span>
          </Link>
          <div className="flex items-center gap-2">
            <TopNav />
            <InstallApp />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-[calc(var(--nav-h)+1.5rem)] sm:pt-8 sm:pb-8">{children}</main>
      <BottomNav />
    </>
  );
}
