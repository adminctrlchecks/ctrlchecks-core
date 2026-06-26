import { Link } from "react-router-dom";
import { AppBrand } from "@/components/brand/AppBrand";

export default function Terms() {
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
        <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <div className="prose prose-slate max-w-none space-y-6 dark:prose-invert">
          <section>
            <h2 className="mb-3 text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CtrlChecks, you agree to these Terms of Service. If you do
              not agree, you must not use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">2. Service Description</h2>
            <p>
              CtrlChecks provides workflow automation tools and integrations with third-party
              services. Features may evolve as the product improves.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">3. Account Responsibilities</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>You are responsible for safeguarding your account credentials.</li>
              <li>You are responsible for all activity under your account.</li>
              <li>You must provide accurate information and keep it up to date.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">4. Acceptable Use</h2>
            <p>You agree not to misuse the platform, including by:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Violating laws or third-party terms.</li>
              <li>Attempting unauthorized access to systems or data.</li>
              <li>Using the service to distribute harmful or abusive content.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">5. Third-Party Integrations</h2>
            <p>
              When you connect Google or other third-party services, you authorize CtrlChecks to
              access only the data required to perform configured workflows. Your use of
              third-party services remains subject to their terms and policies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">6. Data and Privacy</h2>
            <p>
              Our processing of personal data is described in our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">7. Intellectual Property</h2>
            <p>
              CtrlChecks and related content, branding, and software are owned by us or our
              licensors and protected by applicable intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">8. Service Availability</h2>
            <p>
              We aim to keep the service available and reliable, but we do not guarantee
              uninterrupted operation. Maintenance and outages may occur.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, CtrlChecks is not liable for indirect,
              incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">10. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after
              updates means you accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-semibold">11. Contact</h2>
            <p>
              Questions about these terms can be sent to <strong>legal@ctrlchecks.ai</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
