import Link from "next/link";
import { Heart, Home, Search, ShoppingCart, UserRound } from "lucide-react";

const actionClass =
  "rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4">
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tight text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="Zelux home"
        >
          Zelux
        </Link>

        <form action="/search" className="hidden min-w-0 flex-1 md:flex">
          <label className="sr-only" htmlFor="desktop-search">
            Search products
          </label>
          <div className="relative w-full">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="desktop-search"
              name="q"
              aria-label="Search products"
              placeholder="Search products, categories or SKU..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1" aria-label="Primary actions">
          <Link href="/search" className={`${actionClass} md:hidden`} aria-label="Search">
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link
            href="/account/wishlist"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex"
          >
            <Heart size={18} aria-hidden="true" />
            Wishlist
          </Link>
          <Link href="/cart" className={actionClass} aria-label="Cart">
            <ShoppingCart size={21} aria-hidden="true" />
          </Link>
          <Link href="/account" className={actionClass} aria-label="Account">
            <UserRound size={21} aria-hidden="true" />
          </Link>
        </nav>
      </div>

      <div className="hidden border-t border-slate-100 bg-white sm:block">
        <nav
          className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 text-sm font-semibold text-slate-700"
          aria-label="Store navigation"
        >
          <Link href="/shop" className="transition hover:text-indigo-600">Shop</Link>
          <Link href="/new-arrivals" className="transition hover:text-indigo-600">New arrivals</Link>
          <Link href="/featured" className="transition hover:text-indigo-600">Featured</Link>
          <Link href="/best-sellers" className="transition hover:text-indigo-600">Best sellers</Link>
          <Link href="/deals" className="transition hover:text-indigo-600">Deals</Link>
          <Link href="/flash-sale" className="text-amber-600 transition hover:text-amber-700">Flash sale</Link>
          <Link href="/track-order" className="ml-auto transition hover:text-indigo-600">Track order</Link>
        </nav>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] backdrop-blur sm:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          <Link href="/" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600">
            <Home size={18} aria-hidden="true" />
            Home
          </Link>
          <Link href="/search" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600">
            <Search size={18} aria-hidden="true" />
            Search
          </Link>
          <Link href="/cart" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600">
            <ShoppingCart size={18} aria-hidden="true" />
            Cart
          </Link>
          <Link href="/account" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-indigo-600">
            <UserRound size={18} aria-hidden="true" />
            Account
          </Link>
        </div>
      </nav>
    </header>
  );
}
