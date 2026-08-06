import { Link } from "react-router-dom";
import { SECTION_SHELL } from "@/components/landing/landing-layout";

const footerLinks = {
  Product: [
    { name: "Workflow demo", href: "#demo" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Integrations", href: "#integrations" },
    { name: "Templates", href: "#templates" },
    { name: "Plans", href: "/subscriptions", isRoute: true },
  ],
  Resources: [
    { name: "Documentation", href: "/docs", isRoute: true },
    { name: "Getting Started", href: "/docs/getting-started/what-is-ctrlchecks", isRoute: true },
    { name: "Node docs", href: "/docs/introduction", isRoute: true },
    { name: "Templates", href: "/templates", isRoute: true },
  ],
  Trust: [
    { name: "Security", href: "#trust" },
    { name: "Why CtrlChecks", href: "#why-ctrlchecks" },
    { name: "FAQ", href: "#faq" },
    { name: "Privacy", href: "/privacy", isRoute: true },
    { name: "Terms", href: "/terms", isRoute: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-transparent">
      <div className={`${SECTION_SHELL} py-10 lg:py-12`}>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center">
                <img src="/favicon.ico" alt="" className="h-full w-full" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">CtrlChecks</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Turn a plain-English request into a visible, connected workflow your whole team can understand.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">{category}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.isRoute ? (
                      <Link
                        to={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.name}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} CtrlChecks. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link to="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <a href="#trust" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Trust
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
