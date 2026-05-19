import { Client } from "@notionhq/client";
import type { LeadInput, ScoredLead } from "./scoring";

const notionToken = process.env.NOTION_TOKEN;
const leadsDbId = process.env.NOTION_LEADS_DB_ID;

export function notionConfigured(): boolean {
  return Boolean(notionToken && leadsDbId);
}

export async function writeLeadToNotion(
  lead: LeadInput,
  scored: ScoredLead
): Promise<void> {
  if (!notionConfigured()) {
    console.warn("Notion not configured — lead not persisted:", lead.email);
    return;
  }

  const notion = new Client({ auth: notionToken });

  await notion.pages.create({
    parent: { database_id: leadsDbId! },
    properties: {
      Name: {
        title: [
          { text: { content: `${lead.firstName} ${lead.lastName}`.trim() } },
        ],
      },
      State: { select: { name: lead.state } },
      "Land Status": { rich_text: [{ text: { content: lead.landOwnership } }] },
      Acreage: { rich_text: [{ text: { content: lead.acreage } }] },
      Timeline: { rich_text: [{ text: { content: lead.timeline } }] },
      "Build Stage": { rich_text: [{ text: { content: lead.buildStage } }] },
      Budget: { rich_text: [{ text: { content: lead.budget } }] },
      Score: { number: scored.score },
      Tier: { select: { name: scored.tier } },
      Status: { select: { name: "New" } },
      Source: {
        rich_text: [
          {
            text: {
              content: lead.variant
                ? `${lead.source} / ${lead.variant}`
                : lead.source,
            },
          },
        ],
      },
      Phone: { phone_number: lead.phone || null },
      Email: { email: lead.email || null },
      "Best Time": { rich_text: [{ text: { content: lead.bestTime } }] },
      "Submitted At": { date: { start: new Date().toISOString() } },
    },
  });
}

export interface NotionLeadRow {
  pageId: string;
  lead: LeadInput;
  scored: ScoredLead;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function richText(prop: any): string {
  return prop?.rich_text?.[0]?.plain_text ?? "";
}

function pageToLeadRow(page: any): NotionLeadRow {
  const p = page.properties ?? {};
  const fullName: string = p.Name?.title?.[0]?.plain_text ?? "";
  const [firstName, ...rest] = fullName.split(" ");
  const tier = p.Tier?.select?.name;

  return {
    pageId: page.id,
    lead: {
      state: p.State?.select?.name ?? "",
      landOwnership: richText(p["Land Status"]),
      acreage: richText(p.Acreage),
      timeline: richText(p.Timeline),
      buildStage: richText(p["Build Stage"]),
      budget: richText(p.Budget),
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      phone: p.Phone?.phone_number ?? "",
      email: p.Email?.email ?? "",
      bestTime: richText(p["Best Time"]),
      source: richText(p.Source) || "form",
    },
    scored: {
      score: p.Score?.number ?? 0,
      tier: tier === "A" || tier === "B" ? tier : "Nurture",
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function resolveDataSourceId(notion: Client): Promise<string> {
  const db: any = await notion.databases.retrieve({
    database_id: leadsDbId!,
  });
  return db?.data_sources?.[0]?.id ?? leadsDbId!;
}

export async function readLeadsByStatus(
  status: string,
  limit = 100
): Promise<NotionLeadRow[]> {
  if (!notionConfigured()) {
    console.warn("Notion not configured — cannot read leads.");
    return [];
  }

  const notion = new Client({ auth: notionToken });
  const dataSourceId = await resolveDataSourceId(notion);

  const res: any = await (notion as any).dataSources.query({
    data_source_id: dataSourceId,
    filter: { property: "Status", select: { equals: status } },
    page_size: limit,
  });

  return res.results.map(pageToLeadRow);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function updateLeadAssessment(
  pageId: string,
  briefing: string,
  newStatus: string
): Promise<void> {
  if (!notionConfigured()) return;

  const notion = new Client({ auth: notionToken });
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Briefing: { rich_text: [{ text: { content: briefing.slice(0, 1900) } }] },
      Status: { select: { name: newStatus } },
    },
  });
}

export async function updateLeadStatus(
  pageId: string,
  newStatus: string
): Promise<void> {
  if (!notionConfigured()) return;

  const notion = new Client({ auth: notionToken });
  await notion.pages.update({
    page_id: pageId,
    properties: { Status: { select: { name: newStatus } } },
  });
}
