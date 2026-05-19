import { Resend } from "resend";
import type { LeadInput, ScoredLead } from "./scoring";

const resendKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.LEAD_ALERT_FROM ?? "leads@barndobuilt.com";
const toAddress = process.env.LEAD_ALERT_TO ?? "handler@rebirthmultiverse.com";

export async function sendLeadAlert(
  lead: LeadInput,
  scored: ScoredLead
): Promise<void> {
  if (!resendKey) {
    console.warn("Resend not configured — alert email skipped:", lead.email);
    return;
  }

  const resend = new Resend(resendKey);

  await resend.emails.send({
    from: fromAddress,
    to: toAddress,
    subject: `New ${scored.tier} lead — ${lead.firstName} ${lead.lastName} (${lead.state})`,
    text: [
      `New lead captured via ${lead.source}.`,
      ``,
      `Name:      ${lead.firstName} ${lead.lastName}`,
      `State:     ${lead.state}`,
      `Land:      ${lead.landOwnership}`,
      `Acreage:   ${lead.acreage}`,
      `Timeline:  ${lead.timeline}`,
      `Stage:     ${lead.buildStage}`,
      `Budget:    ${lead.budget}`,
      `Phone:     ${lead.phone}`,
      `Email:     ${lead.email}`,
      `Best time: ${lead.bestTime}`,
      ``,
      `Score:     ${scored.score}`,
      `Tier:      ${scored.tier}`,
      `Variant:   ${lead.variant ?? "n/a"}`,
    ].join("\n"),
  });
}
