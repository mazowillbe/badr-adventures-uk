import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Mountain,
  MountainSnow,
  ShoppingBag,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";
import { supabase, resetSupabaseClient } from "@/lib/supabase";
import { clearStoredUser } from "@/lib/api";
import { CartBadge } from "@/lib/cart-context";

export type Me = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export type AuthContextValue = {
  user: Me | null;
  loading: boolean;
  refresh: () => Promise<Me | null>;
  signOut: () => Promise<void>;
  setUser: (u: Me | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within SiteShell");
  return ctx;
}

const NAV_LINKS = [
  { to: "/", label: "Home", tag: "01" },
  { to: "/hikes", label: "Hikes", tag: "02" },
  { to: "/rent", label: "Rent", tag: "03" },
  { to: "/about", label: "About", tag: "04" },
  { to: "/contact", label: "Contact", tag: "05" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

  const refresh = async () => {
    try {
      const data = await api<{ user: Me | null }>("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = async () => {
    try {
      await supabase().auth.signOut();
    } catch {
      // ignore
    }
    // Manually clear ALL persisted session data so a page reload doesn't re-auth
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("badr.") || key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
    clearStoredUser();
    resetSupabaseClient();
    setUser(null);
    toast.success("Signed out");
    navigate("/");
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, signOut, setUser }),
    [user, loading],
  );

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <AuthContext.Provider value={value}>
      <div className="min-h-screen bg-paper text-ink font-body">
        {/* --- HEADER --- */}
        <header
          className={
            "sticky top-0 z-40 border-b transition-all duration-300 " +
            (scrolled
              ? "border-ink/10 bg-paper/85 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.02)]"
              : "border-transparent bg-paper/60 backdrop-blur-sm")
          }
        >
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="group flex items-center gap-3"
              aria-label="Badr Adventures home"
            >
              <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-pine-2/30 transition-transform group-hover:rotate-3">
                <img
                  src="/images/logo.png"
                  alt="Badr Adventures logo"
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-semibold tracking-tight text-pine">
                  Badr Adventures
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
                  Field Atlas · UK
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    "group relative rounded-full px-3.5 py-1.5 text-sm font-medium transition " +
                    (isActive
                      ? "text-pine"
                      : "text-ink-2 hover:text-pine")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-10">{l.label}</span>
                      <span
                        className={
                          "ml-1.5 font-mono text-[10px] tracking-widest " +
                          (isActive ? "text-rust" : "text-ink-3/70")
                        }
                      >
                        {l.tag}
                      </span>
                      {isActive && (
                        <span className="absolute inset-0 -z-0 rounded-full border border-pine/30 bg-pine/5" />
                      )}
                      <span className="absolute bottom-0.5 left-3.5 right-3.5 h-px scale-x-0 bg-rust transition-transform duration-300 group-hover:scale-x-100" />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Cart badge */}
            <CartBadge />

            <div className="hidden items-center gap-2 md:flex">
              {loading ? (
                <div className="h-9 w-32 rounded-full bg-ink/5" />
              ) : user ? (
                <UserMenu
                  user={user}
                  signOut={signOut}
                  initials={initials(user.name)}
                />
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink-2 transition hover:border-pine hover:text-pine"
                  >
                    <LogIn className="h-4 w-4" /> Sign in
                  </Link>
                  <Link
                    to="/sign-up"
                    className="group inline-flex items-center gap-1.5 rounded-full bg-pine px-4 py-1.5 text-sm font-medium text-amber-200 shadow-sm transition hover:bg-pine-2"
                  >
                    <UserPlus className="h-4 w-4" /> Sign up
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-rust transition-transform group-hover:scale-150" />
                  </Link>
                  <Link
                    to="/cart"
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink-2 transition hover:border-pine hover:text-pine"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {count > 0 && (
                      <span className="ml-1 h-1.5 w-1.5 rounded-full bg-rust" />
                    )}
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label="Toggle navigation"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-paper text-ink-2"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="sr-only">Toggle navigation</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {mobileOpen && (
            <div className="border-t border-ink/10 bg-paper md:hidden">
              <div className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
                {NAV_LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) =>
                      "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium " +
                      (isActive
                        ? "bg-pine/10 text-pine"
                        : "text-ink-2 hover:bg-ink/5")
                    }
                  >
                    <span>{l.label}</span>
                    <span className="font-mono text-[10px] tracking-widest text-ink-3">
                      {l.tag}
                    </span>
                  </NavLink>
                ))}
                <div className="mt-3 flex gap-2">
                  {user ? (
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex-1 rounded-xl bg-pine px-4 py-2 text-sm font-medium text-amber-200"
                    >
                      <LogOut className="mr-1 inline h-4 w-4" /> Sign out
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/sign-in"
                        className="flex-1 rounded-xl border border-ink/15 px-4 py-2 text-center text-sm font-medium text-ink-2"
                      >
                        Sign in
                      </Link>
                      <Link
                        to="/sign-up"
                        className="flex-1 rounded-xl bg-pine px-4 py-2 text-center text-sm font-medium text-amber-200"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </header>

        <main>{children}</main>

        {/* --- FOOTER --- */}
        <footer className="relative mt-24 overflow-hidden border-t border-ink/10 bg-pine text-paper">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_20%_20%,#f5e7c8_0,transparent_40%),radial-gradient(circle_at_80%_60%,#d8a657_0,transparent_40%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <MountainSnow className="h-5 w-5" />
                <span className="font-display text-xl font-semibold">
                  Badr Adventures
                </span>
              </div>
              <p className="mt-3 text-sm text-paper/70">
                Guided hiking, camping, and kayaking across the UK's most
                beautiful landscapes. Leave the creature comforts at home and
                embrace the challenge.
              </p>
              <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                Compass bearing 354° · True North
              </div>
            </div>
            <div>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                Explore
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/hikes" className="text-paper/80 hover:text-amber-200">
                    All hikes
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-paper/80 hover:text-amber-200">
                    About us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-paper/80 hover:text-amber-200">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                Account
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/sign-in" className="text-paper/80 hover:text-amber-200">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/sign-up" className="text-paper/80 hover:text-amber-200">
                    Create an account
                  </Link>
                </li>
                <li>
                  <Link to="/bookings" className="text-paper/80 hover:text-amber-200">
                    My bookings
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="text-paper/80 hover:text-amber-200">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link to="/privacy" className="text-paper/80 hover:text-amber-200">
                    Privacy Notice
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="text-paper/80 hover:text-amber-200">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                Get in touch
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-paper/80">
                <li>jefferygo0o@gmail.com</li>
                <li>Lake District · Peak District · Snowdonia</li>
              </ul>
            </div>
          </div>
          <div className="relative border-t border-paper/10">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-paper/50 sm:flex-row sm:px-6 lg:px-8">
              <p>
                © {new Date().getFullYear()} Badr Adventures UK. All rights
                reserved.
              </p>
              <p className="flex items-center gap-1.5 font-mono uppercase tracking-[0.22em]">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Bringing
                green to your deen
              </p>
            </div>
          </div>
        </footer>
      </div>
    </AuthContext.Provider>
  );
}

function UserMenu({
  user,
  signOut,
  initials,
}: {
  user: Me;
  signOut: () => void;
  initials: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => navigate("/bookings")}
        className="hidden items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-sm font-medium text-ink-2 shadow-sm hover:border-pine/40 hover:text-pine sm:flex"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine text-[10px] font-bold text-amber-200">
          {initials}
        </span>
        <span className="max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
      </button>
      <button
        type="button"
        onClick={signOut}
        className="rounded-full border border-ink/10 bg-paper p-2 text-ink-2 hover:border-pine/40 hover:text-pine"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function CartBadge() {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/cart")}
      className="relative rounded-full border border-ink/10 bg-paper p-2 text-ink-2 hover:border-pine/40 hover:text-pine transition"
      aria-label={`Cart with ${itemCount} items`}
    >
      <ShoppingBag className="h-4 w-4" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rust px-1 text-[9px] font-bold text-paper leading-none">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
