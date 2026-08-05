import { Link } from "react-router-dom";
import { AppBrand } from "@/components/brand/AppBrand";

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <AppBrand context="marketing" />
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-4xl font-bold">Support</h1>
        <p className="mb-8 text-muted-foreground">
          Get help with CtrlChecks workflows, connections, and integrations.
        </p>

        <div className="prose prose-slate max-w-none space-y-6 dark:prose-invert">
          <section>
            <h2 className="mb-3 text-2xl font-semibold">Contact Support</h2>
            <p>
              Reach our team directly at{" "}
              <a href="mailto:support@ctrlchecks.ai" className="text-primary hover:underline">
                support@ctrlchecks.ai
              </a>
              . We aim to respond within one business day.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">Documentation</h2>
            <p>
              Guides for building workflows, configuring nodes, and managing connections are
              available in the{" "}
              <Link to="/docs/introduction" className="text-primary hover:underline">
                CtrlChecks Documentation
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">Integration &amp; Connection Issues</h2>
            <p>
              If a third-party connection (such as Zoom, Slack, or Google) fails to authorize or
              a node returns an unexpected error, include the following in your message so we can
              help quickly:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>The integration/provider name and node type involved.</li>
              <li>The workflow name or ID, if applicable.</li>
              <li>Any error message shown in the CtrlChecks debug panel or execution log.</li>
              <li>Roughly when the issue occurred.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">Account &amp; Billing</h2>
            <p>
              For account access, subscription, or billing questions, email{" "}
              <a href="mailto:support@ctrlchecks.ai" className="text-primary hover:underline">
                support@ctrlchecks.ai
              </a>{" "}
              with your account email address.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
