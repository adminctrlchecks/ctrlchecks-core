import { motion, useReducedMotion } from "framer-motion";
import { landingViewport, springSoft } from "@/components/landing/landing-motion";
import { SECTION_PROSE, SECTION_SHELL } from '@/components/landing/landing-layout';
import { GoogleLogo } from "@/components/icons/GoogleLogo";

type IntegrationLogo = {
  name: string;
  src: string;
};

const integrationFiles = [
  "ActiveCampaign.svg",
  "Airtable.svg",
  "Anthropic.svg",
  "AWS-S3.svg",
  "bitbucket.svg",
  "ClickUp.svg",
  "Claude.svg",
  "Cloudflare.svg",
  "Cohere.svg",
  "Discord.svg",
  "Dropbox.svg",
  "facebook.svg",
  "Firebase.svg",
  "Freshdesk.svg",
  "FTP.svg",
  "Github.svg",
  "Gmail.svg",
  "Google-Contacts.svg",
  "Google-Calender.svg",
  "Google-Docs.svg",
  "Google-Drive.svg",
  "Google-Gemini.svg",
  "Google-Sheets.svg",
  "Google-Bigquery.svg",
  "Google.svg",
  "Instagram.svg",
  "Intercom.svg",
  "Jenkins.svg",
  "Jira.svg",
  "linkedin.svg",
  "Mailchimp.svg",
  "Microsoft-Teams.svg",
  "Microsoft.svg.svg",
  "monday.svg",
  "MongoDB.svg",
  "MySQL.svg",
  "Notion.svg",
  "Ollama.svg",
  "OneDrive.svg",
  "OpenAI-GPT.svg",
  "Outlook.svg",
  "PayPal.svg",
  "Pinecone.svg",
  "Pipedrive.svg",
  "Postgre-Sql.svg",
  "Redis.svg",
  "Salesforce.svg",
  "Sendgrid.svg",
  "SFTP.svg",
  "Shopify.svg",
  "Slack.svg",
  "Stripe.svg",
  "Supabase.svg",
  "Telegram.svg",
  "Twilio.svg",
  "Twitter.svg",
  "Whatsapp-Cloude.svg",
  "WooCommerce.svg",
  "Youtube.svg",
  "Zoho.svg",
  "Zoho-CRM.svg",
  "Gitlab.svg",
  "Hubspot.svg",
];

const formatNameFromFile = (file: string) =>
  file
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const displayNameByFile: Record<string, string> = {
  "Github.svg": "GitHub",
  "Hubspot.svg": "HubSpot",
  "Gmail.svg": "Gmail",
  "Google-Contacts.svg": "Google Contacts",
  "Google-Calender.svg": "Google Calendar",
  "Google-Docs.svg": "Google Docs",
  "Google-Drive.svg": "Google Drive",
  "Google-Gemini.svg": "Google Gemini",
  "Google-Bigquery.svg": "Google BigQuery",
  "Google-Sheets.svg": "Google Sheets",
  "Google.svg": "Google",
  "MongoDB.svg": "MongoDB",
  "MySQL.svg": "MySQL",
  "OpenAI-GPT.svg": "OpenAI GPT",
  "WooCommerce.svg": "WooCommerce",
  "Twitter.svg": "Twitter/X",
  "Zoho-CRM.svg": "Zoho CRM",
  "AWS-S3.svg": "AWS S3",
  "SFTP.svg": "SFTP",
  "FTP.svg": "FTP",
  "OneDrive.svg": "OneDrive",
  "Postgre-Sql.svg": "PostgreSQL",
  "Whatsapp-Cloude.svg": "WhatsApp Cloud",
  "Youtube.svg": "YouTube",
  "linkedin.svg": "LinkedIn",
  "facebook.svg": "Facebook",
  "bitbucket.svg": "Bitbucket",
  "Gitlab.svg": "GitLab",
  "Microsoft-Teams.svg": "Microsoft Teams",
  "Microsoft.svg.svg": "Microsoft",
  "monday.svg": "monday.com",
  "Sendgrid.svg": "SendGrid",
};

const integrations: IntegrationLogo[] = integrationFiles.map((file) => ({
  name: displayNameByFile[file] ?? formatNameFromFile(file),
  src: `/integrations-logos/${file}`,
}));

const splitIntoColumns = <T,>(items: T[], columnCount: number): T[][] => {
  const baseSize = Math.floor(items.length / columnCount);
  const remainder = items.length % columnCount;
  const columns: T[][] = [];
  let offset = 0;
  for (let i = 0; i < columnCount; i += 1) {
    const size = i < remainder ? baseSize + 1 : baseSize;
    columns.push(items.slice(offset, offset + size));
    offset += size;
  }
  return columns;
};

/**
 * Six columns so the marquee fills the widened section shell. Columns past the
 * breakpoint's grid width are hidden rather than wrapped — wrapping would break
 * the fixed-height scrollers. COLUMN_VISIBILITY must stay in step with the grid
 * column counts on the container below.
 */
const MARQUEE_COLUMN_COUNT = 6;
const COLUMN_DIRECTIONS: Array<'up' | 'down'> = ['up', 'down', 'up', 'down', 'up', 'down'];
const COLUMN_VISIBILITY = ['', '', 'hidden sm:block', 'hidden lg:block', 'hidden xl:block', 'hidden xl:block'];
const COLUMN_DURATION = 30;

function normalizeDisplayName(name: string) {
  return name;
}

const normalizedIntegrations = integrations.map((item) => ({
  ...item,
  name: normalizeDisplayName(item.name),
}));

const columns = splitIntoColumns(normalizedIntegrations, MARQUEE_COLUMN_COUNT);

function LogoTile({ item }: { item: IntegrationLogo }) {
  const isGoogleTile = item.name.toLowerCase() === "google";
  return (
    <div className="flex flex-row items-center gap-2.5 rounded-lg bg-background/70 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-white/5">
      <div className="h-8 w-8 shrink-0 rounded-md bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-white dark:ring-white/10">
        {isGoogleTile ? (
          <GoogleLogo size="lg" className="h-full w-full [image-rendering:-webkit-optimize-contrast]" />
        ) : (
          <img
            src={item.src}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-contain [image-rendering:-webkit-optimize-contrast]"
          />
        )}
      </div>
      <p className="min-w-0 truncate text-xs font-medium text-muted-foreground sm:text-sm">
        {item.name}
      </p>
    </div>
  );
}

const marqueeStyles = `
@keyframes marquee-up {
  from { transform: translateY(0); }
  to   { transform: translateY(-50%); }
}
@keyframes marquee-down {
  from { transform: translateY(-50%); }
  to   { transform: translateY(0); }
}
`;

function MarqueeColumn({
  items,
  direction,
  duration,
  className = '',
}: {
  items: IntegrationLogo[];
  direction: 'up' | 'down';
  duration: number;
  className?: string;
}) {
  const duplicated = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: `marquee-${direction} ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {duplicated.map((item, i) => (
          <LogoTile key={`${item.name}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export function IntegrationsMarqueeSection() {
  const reduceMotion = useReducedMotion();

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: marqueeStyles }} />
    <section
      id="integrations"
      className="relative scroll-mt-24 py-4 sm:py-5"
      aria-labelledby="integrations-heading"
    >
      <div className={SECTION_SHELL}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.35 } : springSoft}
          className={SECTION_PROSE}
        >
          <h2 id="integrations-heading" className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Workflow integrations for the tools you already use
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Connect Gmail, Slack, Sheets, Stripe, Notion, Jira, and APIs without hiding the workflow logic.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={landingViewport}
          transition={reduceMotion ? { duration: 0.35 } : { ...springSoft, delay: 0.08 }}
          className="relative mt-4 overflow-hidden rounded-lg border border-border/50 bg-background/20 p-3 shadow-[0_18px_45px_-32px_hsl(var(--foreground)/0.45)] backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:p-4"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-background to-transparent" />

          {reduceMotion ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {normalizedIntegrations.map((item) => (
                <LogoTile key={item.name} item={item} />
              ))}
            </div>
          ) : (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
              style={{ height: '190px' }}
            >
              {columns.map((colItems, index) => (
                <MarqueeColumn
                  key={`col-${index}`}
                  items={colItems}
                  direction={COLUMN_DIRECTIONS[index] ?? 'up'}
                  duration={COLUMN_DURATION}
                  className={COLUMN_VISIBILITY[index] ?? ''}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
    </>
  );
}
