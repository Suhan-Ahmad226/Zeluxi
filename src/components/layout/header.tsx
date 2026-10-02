import Link from "next/link";
import { Heart, Search, ShoppingCart, UserRound } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-4">
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tight text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
              className="h-10 w-full rounded-xl border bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1" aria-label="Primary actions">
          <Link
            href="/search"
            className="rounded-xl p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden"
            aria-label="Search"
          >
            <Search size={20} aria-hidden="true" />
          </Link>
          <Link
            href="/account/wishlist"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex"
          >
            <Heart size={18} aria-hidden="true" />
            Wishlist
          </Link>
          <Link
            href="/cart"
            className="rounded-xl p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Cart"
          >
            <ShoppingCart size={21} aria-hidden="true" />
          </Link>
          <Link
            href="/account"
            className="rounded-xl p-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Account"
          >
            <UserRound size={21} aria-hidden="true" />
          </Link>
        </nav>
      </div>

      <div className="hidden border-t bg-white sm:block">
        <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2 text-sm font-semibold text-slate-700" aria-label="Store navigation">
          <Link href="/shop" className="hover:text-indigo-600">Shop</Link>
          <Link href="/new-arrivals" className="hover:text-indigo-600">New arrivals</Link>
          <Link href="/best-sellers" className="hover:text-indigo-600">Best sellers</Link>
          <Link href="/deals" className="hover:text-indigo-600">Deals</Link>
          <Link href="/flash-sale" className="text-amber-600 hover:text-amber-700">Flash sale</Link>
          <Link href="/track-order" className="ml-auto hover:text-indigo-600">Track order</Link>
        </nav>
      </div>

      <div className="border-t bg-white sm:hidden">
        <nav className="mx-auto grid max-w-md grid-cols-4 px-2 py-1 text-xs" aria-label="Mobile navigation">
          <Link href="/" className="p-2 text-center font-medium">Home</Link>
          <Link href="/search" className="p-2 text-center font-medium">Search</Link>
          <Link href="/cart" className="p-2 text-center font-medium">Cart</Link>
          <Link href="/account" className="p-2 text-center font-medium">Account</Link>
        </nav>
      </div>
    </header>
  );
}
