/**
 * WhatsApp Message Templates — Escalation-level template definitions
 *
 * Each template maps to a Twilio Content Template (approved via Twilio Console).
 * Templates use `contentSid` + `contentVariables` for the WhatsApp Business API.
 *
 * Outside the 24hr conversation window, ONLY approved templates can be sent.
 * Inside the window, free-form body text is allowed.
 */

export type WhatsAppEscalationLevel = "gentle" | "reminder" | "firm" | "urgent" | "escalate";

export interface WhatsAppTemplate {
  level: WhatsAppEscalationLevel;
  name: string;
  /** Twilio Content Template SID — set via practice settings or env */
  contentSid: string | null;
  /** Human-readable body (used for free-form session messages + logs) */
  bodyText: string;
  /** Build contentVariables JSON for Twilio */
  buildVariables: (vars: TemplateVariables) => Record<string, string>;
}

export interface TemplateVariables {
  clientFirstName: string;
  practiceName: string;
  taxYear: string;
  portalUrl: string;
  deadlineDate?: string;
  remainingDocs?: number;
  partnerName?: string;
}

// Default Content Template SIDs — override per practice via settings
const DEFAULT_SIDS: Record<WhatsAppEscalationLevel, string | null> = {
  gentle: process.env.WA_TEMPLATE_SID_GENTLE || null,
  reminder: process.env.WA_TEMPLATE_SID_REMINDER || null,
  firm: process.env.WA_TEMPLATE_SID_FIRM || null,
  urgent: process.env.WA_TEMPLATE_SID_URGENT || null,
  escalate: process.env.WA_TEMPLATE_SID_ESCALATE || null,
};

const templates: WhatsAppTemplate[] = [
  {
    level: "gentle",
    name: "chase_gentle_v1",
    contentSid: DEFAULT_SIDS.gentle,
    // Template: "Hi {{1}}, {{2}} needs a few documents from you for {{3}}. Upload easily here: {{4}}"
    bodyText: "Hi {{clientFirstName}}, {{practiceName}} needs a few documents from you for {{taxYear}}. Upload easily here: {{portalUrl}}",
    buildVariables: (v) => ({
      "1": v.clientFirstName,
      "2": v.practiceName,
      "3": v.taxYear,
      "4": v.portalUrl,
    }),
  },
  {
    level: "reminder",
    name: "chase_reminder_v1",
    contentSid: DEFAULT_SIDS.reminder,
    // Template: "Hi {{1}}, just a reminder from {{2}} — we still need a few documents for {{3}}. It only takes a minute: {{4}}"
    bodyText: "Hi {{clientFirstName}}, just a reminder from {{practiceName}} — we still need a few documents for {{taxYear}}. It only takes a minute: {{portalUrl}}",
    buildVariables: (v) => ({
      "1": v.clientFirstName,
      "2": v.practiceName,
      "3": v.taxYear,
      "4": v.portalUrl,
    }),
  },
  {
    level: "firm",
    name: "chase_firm_v1",
    contentSid: DEFAULT_SIDS.firm,
    // Template: "Hi {{1}}, {{2}} still needs {{3}} documents from you. The deadline for {{4}} is {{5}}. Please upload now: {{6}}"
    bodyText: "Hi {{clientFirstName}}, {{practiceName}} still needs {{remainingDocs}} documents from you. The deadline for {{taxYear}} is {{deadlineDate}}. Please upload now: {{portalUrl}}",
    buildVariables: (v) => ({
      "1": v.clientFirstName,
      "2": v.practiceName,
      "3": String(v.remainingDocs ?? "some"),
      "4": v.taxYear,
      "5": v.deadlineDate ?? "soon",
      "6": v.portalUrl,
    }),
  },
  {
    level: "urgent",
    name: "chase_urgent_v1",
    contentSid: DEFAULT_SIDS.urgent,
    // Template: "⚠️ {{1}}, this is urgent. {{2}} needs your documents for {{3}} by {{4}} or you may face late-filing penalties. Upload now: {{5}}"
    bodyText: "⚠️ {{clientFirstName}}, this is urgent. {{practiceName}} needs your documents for {{taxYear}} by {{deadlineDate}} or you may face late-filing penalties. Upload now: {{portalUrl}}",
    buildVariables: (v) => ({
      "1": v.clientFirstName,
      "2": v.practiceName,
      "3": v.taxYear,
      "4": v.deadlineDate ?? "immediately",
      "5": v.portalUrl,
    }),
  },
  {
    level: "escalate",
    name: "chase_final_v1",
    contentSid: DEFAULT_SIDS.escalate,
    // Template: "Hi {{1}}, this is {{2}} from {{3}}. We've tried to reach you several times about your {{4}} documents. This is our final notice before we escalate. Please upload here: {{5}} or call us to discuss."
    bodyText: "Hi {{clientFirstName}}, this is {{partnerName}} from {{practiceName}}. We've tried to reach you several times about your {{taxYear}} documents. This is our final notice before we escalate. Please upload here: {{portalUrl}} or call us to discuss.",
    buildVariables: (v) => ({
      "1": v.clientFirstName,
      "2": v.partnerName ?? "a senior partner",
      "3": v.practiceName,
      "4": v.taxYear,
      "5": v.portalUrl,
    }),
  },
];

/**
 * Get the WhatsApp template for a given escalation level.
 */
export function getTemplateForLevel(level: WhatsAppEscalationLevel): WhatsAppTemplate {
  return templates.find((t) => t.level === level) ?? templates[0]!;
}

/**
 * Get all templates (for settings page / management).
 */
export function getAllTemplates(): WhatsAppTemplate[] {
  return templates;
}

/**
 * Build the free-form body text with variables interpolated.
 */
export function buildFreeFormBody(level: WhatsAppEscalationLevel, vars: TemplateVariables): string {
  const template = getTemplateForLevel(level);
  return template.bodyText
    .replace("{{clientFirstName}}", vars.clientFirstName)
    .replace("{{practiceName}}", vars.practiceName)
    .replace("{{taxYear}}", vars.taxYear)
    .replace("{{portalUrl}}", vars.portalUrl)
    .replace("{{deadlineDate}}", vars.deadlineDate ?? "soon")
    .replace("{{remainingDocs}}", String(vars.remainingDocs ?? "some"))
    .replace("{{partnerName}}", vars.partnerName ?? "a senior partner");
}

/**
 * Determine whether to use template or free-form based on conversation window.
 * Returns { useTemplate: boolean, contentSid?, contentVariables?, body? }
 */
export function buildWhatsAppPayload(
  level: WhatsAppEscalationLevel,
  vars: TemplateVariables,
  isInConversationWindow: boolean,
  overrideContentSid?: string | null,
): {
  useTemplate: boolean;
  contentSid?: string;
  contentVariables?: string;
  body?: string;
} {
  const template = getTemplateForLevel(level);
  const contentSid = overrideContentSid ?? template.contentSid;

  // If inside 24hr window, prefer free-form (cheaper, more flexible)
  if (isInConversationWindow) {
    return {
      useTemplate: false,
      body: buildFreeFormBody(level, vars),
    };
  }

  // Outside window — must use approved template
  if (!contentSid) {
    // No template SID configured — fall back to template anyway
    // Twilio will reject this, but we log the attempt
    console.warn(`No WhatsApp template SID configured for level: ${level}`);
    return {
      useTemplate: true,
      body: buildFreeFormBody(level, vars),
    };
  }

  return {
    useTemplate: true,
    contentSid,
    contentVariables: JSON.stringify(template.buildVariables(vars)),
  };
}
