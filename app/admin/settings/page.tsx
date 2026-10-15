import { requirePermission, can, mfaRequired } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { FIELD, Panel, Pill, Table, Td } from "@/components/admin/kit";
import { requestSettingChangeAction } from "@/lib/actions/admin";
import { SETTINGS } from "@/lib/settings";
import { paymentsConfigured, webhooksConfigured } from "@/lib/payments/razorpay";

export const metadata = { title: "Settings and integrations" };

/** Integration status shows whether a secret is configured, never the secret itself. */
export default async function SettingsPage() {
  const actor = await requirePermission("settings.view");
  const stored = Object.fromEntries((await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTINGS) } } })).map((s) => [s.key, s.value]));
  const integrations: [string, boolean, string][] = [
    ["Payments (Razorpay keys)", paymentsConfigured(), "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Without them, paid checkout is disabled and learners are told so."],
    ["Payment webhooks", webhooksConfigured(), "RAZORPAY_WEBHOOK_SECRET. Webhooks confirm payments and refunds even if the learner closes the browser."],
    ["Email delivery", !!process.env.RESEND_API_KEY, "RESEND_API_KEY. Without it, emails are written to the server log in development only."],
    ["Scheduled jobs", !!process.env.CRON_SECRET, "CRON_SECRET, used by the scheduler calling /api/cron (publications, approvals, subscriptions, retention)."],
    ["Administrator MFA enforced", mfaRequired(), "ADMIN_MFA_REQUIRED (on by default in production)."],
  ];
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Administration" title="Settings and integrations" lede="Operational settings change through an approval: one administrator requests, a different one with configuration authority approves." />
      <Panel title="Integrations" className="mt-8">
        <ul className="flex flex-col gap-2 text-[13.5px]">
          {integrations.map(([label, ok, hint]) => (
            <li key={label} className="flex flex-wrap items-baseline gap-2">
              <Pill tone={ok ? "green" : "amber"}>{ok ? "configured" : "not configured"}</Pill>
              <span className="font-medium">{label}</span>
              <span className="text-[12px] text-muted-foreground">{hint}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="mt-8">
        <Table head={["Setting", "Current value", can(actor, "settings.request") ? "Request a change" : ""]} minWidth="52rem">
          {Object.entries(SETTINGS).map(([key, def]) => (
            <tr key={key}>
              <Td>
                {def.label}
                <span className="text-data block text-[11px] text-muted-foreground">{key}</span>
              </Td>
              <Td>
                {String(stored[key] ?? def.default)}
                {stored[key] === undefined && <span className="block text-[11px] text-muted-foreground">default</span>}
              </Td>
              <Td>
                {can(actor, "settings.request") && (
                  <ActionForm action={requestSettingChangeAction} className="flex flex-wrap gap-1.5" resetOnSuccess success="Requested.">
                    <input type="hidden" name="key" value={key} />
                    <input name="value" required placeholder="New value" aria-label={`New value for ${def.label}`} className={`${FIELD} w-32`} />
                    <input name="reason" required placeholder="Reason" aria-label="Reason" className={`${FIELD} w-44`} />
                    <button className="rounded-[3px] border border-input px-2.5 text-[12.5px]">Request</button>
                  </ActionForm>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
