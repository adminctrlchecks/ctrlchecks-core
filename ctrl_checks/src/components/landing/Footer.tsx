import { Link } from "react-router-dom";
import { Github, Twitter, Linkedin, Youtube } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Workflow demo", href: "#demo" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Trust & security", href: "#trust" },
    { name: "Developer platform", href: "#developer-platform" },
    { name: "Integrations", href: "#plugins-api" },
    { name: "Industries", href: "#verticals" },
    { name: "Why CtrlChecks", href: "#why-ctrlchecks" },
    { name: "Subscription", href: "/subscriptions", isRoute: true },
    { name: "FAQ", href: "#faq" },
  ],
  Resources: [
    { name: "Documentation", href: "/docs", isRoute: true },
    { name: "Getting Started", href: "/docs/getting-started/what-is-ctrlchecks", isRoute: true },
    { name: "Node docs", href: "/docs/introduction", isRoute: true },
    { name: "Templates", href: "/templates", isRoute: true },
    { name: "Community", href: "#" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Press", href: "#" },
    { name: "Contact", href: "#" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "#" },
    { name: "Trust", href: "#trust" },
    { name: "GDPR", href: "#" },
  ],
};

const socialLinks = [
  { name: "GitHub", icon: Github, href: "#" },
  { name: "Twitter", icon: Twitter, href: "#" },
  { name: "LinkedIn", icon: Linkedin, href: "#" },
  { name: "YouTube", icon: Youtube, href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-transparent">
      <div className="container mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center">
                <img src="/favicon.ico" alt="" className="h-full w-full" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                CtrlChecks
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Turn a plain-English request into a running, connected workflow.{" "}
              <a
                href="https://ctrlchecks.ai"
                className="font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                ctrlchecks.ai
              </a>
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/90">
                {category}
              </h3>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    {(link as any).isRoute ? (
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CtrlChecks. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <a
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
