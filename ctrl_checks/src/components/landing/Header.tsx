import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";
import { AppBrand } from "@/components/brand/AppBrand";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: "Demo", href: "#demo" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Trust", href: "#trust" },
    { name: "Developers", href: "#developer-platform" },
    { name: "Integrations", href: "#plugins-api" },
    { name: "Verticals", href: "#verticals" },
    { name: "Why us", href: "#why-ctrlchecks" },
    { name: "Docs", href: "/docs", isRoute: true },
    { name: "Plans", href: "/subscriptions", isRoute: true },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <nav className="container mx-auto max-w-7xl px-5 sm:px-8 lg:px-10" aria-label="Main">
        <div className="flex h-[4.25rem] items-center justify-between">
          <AppBrand context="marketing" />

          <div className="hidden xl:flex xl:items-center xl:gap-5">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.name}
                </a>
              )
            )}
          </div>

          <div className="hidden xl:flex xl:items-center xl:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {user ? (
              <Button asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/signin">Sign In</Link>
                </Button>
                <Button asChild className="gradient-primary text-primary-foreground hover:opacity-90">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
              aria-label={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden"
            >
              <div className="max-h-[min(70vh,28rem)] space-y-1 overflow-y-auto pb-4 pt-2">
                {navItems.map((item) =>
                  item.isRoute ? (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <a
                      key={item.name}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  )
                )}
                <div className="mt-4 flex flex-col gap-2 px-3">
                  {user ? (
                    <Button asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link to="/signin">Sign In</Link>
                      </Button>
                      <Button asChild className="gradient-primary text-primary-foreground">
                        <Link to="/signup">Sign Up</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
