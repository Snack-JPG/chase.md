import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const planEnum = pgEnum("plan", ["starter", "professional", "scale"]);
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "manager", "staff"]);
export const clientTypeEnum = pgEnum("client_type", [
  "sole_trader", "limited_company", "partnership", "llp", "trust", "individual",
]);
export const taxObligationEnum = pgEnum("tax_obligation", [
  "self_assessment", "corporation_tax", "vat", "paye", "mtd_itsa",
  "confirmation_statement", "annual_accounts",
]);
export const channelEnum = pgEnum("channel", ["email", "whatsapp", "sms"]);
export const messageStatusEnum = pgEnum("message_status", [
  "pending", "queued", "sent", "delivered", "read", "failed", "opted_out",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "pending", "uploaded", "processing", "classified", "accepted", "rejected", "expired",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", "active", "paused", "completed", "cancelled",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "pending", "active", "completed", "opted_out", "paused",
]);
export const consentStatusEnum = pgEnum("consent_status", [
  "granted", "revoked", "expired", "never_asked",
]);
export const whatsappTemplateStatusEnum = pgEnum("wa_template_status", [
  "draft", "submitted", "approved", "rejected",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "create", "update", "delete", "send", "upload", "classify",
  "login", "consent_change", "export", "bulk_action",
]);
export const classificationConfidenceEnum = pgEnum("classification_confidence", [
  "high", "medium", "low", "unknown",
]);
export const escalationLevelEnum = pgEnum("escalation_level", [
  "gentle", "reminder", "firm", "urgent", "escalate",
]);

// ============================================================
// TABLES
// ============================================================

export const practices = pgTable("practices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  clerkOrgId: varchar("clerk_org_id", { length: 255 }).unique(),

  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),

  addressLine1: varchar("address_line_1", { length: 255 }),
  addressLine2: varchar("address_line_2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  postcode: varchar("postcode", { length: 10 }),

  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 7 }).default("#1a1a2e"),

  plan: planEnum("plan").default("starter").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  twilioAccountSid: varchar("twilio_account_sid", { length: 255 }),
  twilioWhatsappNumber: varchar("twilio_whatsapp_number", { length: 50 }),
  whatsappBusinessId: varchar("whatsapp_business_id", { length: 255 }),

  resendDomainId: varchar("resend_domain_id", { length: 255 }),
  customEmailDomain: varchar("custom_email_domain", { length: 255 }),
  fromEmailName: varchar("from_email_name", { length: 100 }).default("chase.md"),

  defaultChaseChannel: channelEnum("default_chase_channel").default("whatsapp"),
  businessHoursStart: varchar("business_hours_start", { length: 5 }).default("09:00"),
  businessHoursEnd: varchar("business_hours_end", { length: 5 }).default("17:30"),
  businessDays: jsonb("business_days").default([1, 2, 3, 4, 5]),
  timezone: varchar("timezone", { length: 50 }).default("Europe/London"),

  maxClients: integer("max_clients").default(100),
  maxCampaigns: integer("max_campaigns").default(5),
  maxWhatsappPerMonth: integer("max_whatsapp_per_month").default(500),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),

  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: userRoleEnum("role").default("staff").notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),

  notifyOnUpload: boolean("notify_on_upload").default(true),
  notifyOnCompletion: boolean("notify_on_completion").default(true),
  notifyDigestFrequency: varchar("notify_digest_frequency", { length: 20 }).default("daily"),

  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("users_practice_id_idx").on(t.practiceId),
]);

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),

  externalRef: varchar("external_ref", { length: 100 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  clientType: clientTypeEnum("client_type").notNull(),

  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  whatsappPhone: varchar("whatsapp_phone", { length: 50 }),
  preferredChannel: channelEnum("preferred_channel").default("whatsapp"),

  utr: varchar("utr", { length: 10 }),
  companyNumber: varchar("company_number", { length: 8 }),
  vatNumber: varchar("vat_number", { length: 12 }),
  taxObligations: jsonb("tax_obligations").default([]),
  accountingYearEnd: varchar("accounting_year_end", { length: 5 }),

  chaseEnabled: boolean("chase_enabled").default(true),
  notes: text("notes"),
  tags: jsonb("tags").default([]),

  lastChasedAt: timestamp("last_chased_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("clients_practice_id_idx").on(t.practiceId),
  index("clients_email_idx").on(t.email),
  index("clients_external_ref_idx").on(t.practiceId, t.externalRef),
]);

export const documentTemplates = pgTable("document_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),

  applicableClientTypes: jsonb("applicable_client_types").default([]),
  applicableTaxObligations: jsonb("applicable_tax_obligations").default([]),

  aiClassificationHints: jsonb("ai_classification_hints").default([]),

  helpText: text("help_text"),
  helpImageUrl: varchar("help_image_url", { length: 500 }),
  exampleImageUrl: varchar("example_image_url", { length: 500 }),

  isSystem: boolean("is_system").default(false),
  sortOrder: integer("sort_order").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("doc_templates_practice_id_idx").on(t.practiceId),
]);

export const chaseCampaigns = pgTable("chase_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: campaignStatusEnum("status").default("draft").notNull(),

  taxYear: varchar("tax_year", { length: 7 }).notNull(),
  taxObligation: taxObligationEnum("tax_obligation").notNull(),
  documentTemplateIds: jsonb("document_template_ids").default([]),

  startDate: timestamp("start_date", { withTimezone: true }),
  deadlineDate: timestamp("deadline_date", { withTimezone: true }).notNull(),

  maxChases: integer("max_chases").default(6),
  chaseDaysBetween: integer("chase_days_between").default(7),
  escalateAfterChase: integer("escalate_after_chase").default(4),
  channels: jsonb("channels").default(["whatsapp", "email"]),

  gracePeriodDays: integer("grace_period_days").default(14),
  skipWeekends: boolean("skip_weekends").default(true),
  skipBankHolidays: boolean("skip_bank_holidays").default(true),

  totalEnrollments: integer("total_enrollments").default(0),
  completedEnrollments: integer("completed_enrollments").default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("campaigns_practice_id_idx").on(t.practiceId),
  index("campaigns_status_idx").on(t.status),
]);

export const chaseEnrollments = pgTable("chase_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  campaignId: uuid("campaign_id").notNull().references(() => chaseCampaigns.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),

  status: enrollmentStatusEnum("status").default("pending").notNull(),

  requiredDocumentIds: jsonb("required_document_ids").default([]),
  receivedDocumentIds: jsonb("received_document_ids").default([]),

  currentEscalationLevel: escalationLevelEnum("current_escalation_level").default("gentle"),
  chasesDelivered: integer("chases_delivered").default(0),
  lastChasedAt: timestamp("last_chased_at", { withTimezone: true }),
  nextChaseAt: timestamp("next_chase_at", { withTimezone: true }),

  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionPercent: integer("completion_percent").default(0),

  optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
  optOutReason: text("opt_out_reason"),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("enrollments_practice_id_idx").on(t.practiceId),
  index("enrollments_campaign_id_idx").on(t.campaignId),
  index("enrollments_client_id_idx").on(t.clientId),
  index("enrollments_next_chase_idx").on(t.nextChaseAt),
  uniqueIndex("enrollments_campaign_client_idx").on(t.campaignId, t.clientId),
]);

export const clientDocuments = pgTable("client_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  templateId: uuid("template_id").references(() => documentTemplates.id),
  campaignId: uuid("campaign_id").references(() => chaseCampaigns.id),
  enrollmentId: uuid("enrollment_id").references(() => chaseEnrollments.id),

  fileName: varchar("file_name", { length: 500 }),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  r2Key: varchar("r2_key", { length: 500 }),
  r2Bucket: varchar("r2_bucket", { length: 100 }),

  status: documentStatusEnum("status").default("pending").notNull(),

  aiClassification: varchar("ai_classification", { length: 255 }),
  aiConfidence: decimal("ai_confidence", { precision: 5, scale: 4 }),
  aiConfidenceLevel: classificationConfidenceEnum("ai_confidence_level"),
  aiRawResponse: jsonb("ai_raw_response"),
  classifiedAt: timestamp("classified_at", { withTimezone: true }),

  manualClassification: varchar("manual_classification", { length: 255 }),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  taxYear: varchar("tax_year", { length: 7 }),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),

  virusScanStatus: varchar("virus_scan_status", { length: 20 }).default("pending"),
  virusScannedAt: timestamp("virus_scanned_at", { withTimezone: true }),

  uploadedVia: varchar("uploaded_via", { length: 50 }),
  uploadedByIp: varchar("uploaded_by_ip", { length: 45 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("client_docs_practice_id_idx").on(t.practiceId),
  index("client_docs_client_id_idx").on(t.clientId),
  index("client_docs_campaign_id_idx").on(t.campaignId),
  index("client_docs_status_idx").on(t.status),
]);

export const chaseMessages = pgTable("chase_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  enrollmentId: uuid("enrollment_id").notNull().references(() => chaseEnrollments.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  campaignId: uuid("campaign_id").notNull().references(() => chaseCampaigns.id),

  channel: channelEnum("channel").notNull(),
  escalationLevel: escalationLevelEnum("escalation_level").notNull(),
  chaseNumber: integer("chase_number").notNull(),

  subject: varchar("subject", { length: 255 }),
  bodyText: text("body_text").notNull(),
  bodyHtml: text("body_html"),

  whatsappTemplateId: uuid("whatsapp_template_id").references(() => whatsappTemplates.id),
  whatsappTemplateName: varchar("whatsapp_template_name", { length: 255 }),
  whatsappTemplateVars: jsonb("whatsapp_template_vars"),

  magicLinkId: uuid("magic_link_id").references(() => magicLinks.id),

  status: messageStatusEnum("status").default("pending").notNull(),
  externalMessageId: varchar("external_message_id", { length: 255 }),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),

  emailOpenedAt: timestamp("email_opened_at", { withTimezone: true }),
  emailClickedAt: timestamp("email_clicked_at", { withTimezone: true }),

  costPence: integer("cost_pence"),

  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("messages_practice_id_idx").on(t.practiceId),
  index("messages_enrollment_id_idx").on(t.enrollmentId),
  index("messages_status_idx").on(t.status),
  index("messages_scheduled_idx").on(t.scheduledFor),
]);

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  enrollmentId: uuid("enrollment_id").references(() => chaseEnrollments.id),

  token: varchar("token", { length: 64 }).notNull().unique(),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  usageCount: integer("usage_count").default(0),
  maxUsages: integer("max_usages").default(50),

  ipAllowlist: jsonb("ip_allowlist"),

  isRevoked: boolean("is_revoked").default(false),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("magic_links_token_idx").on(t.token),
  index("magic_links_client_id_idx").on(t.clientId),
]);

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),

  channel: channelEnum("channel").notNull(),
  status: consentStatusEnum("status").notNull(),

  consentedAt: timestamp("consented_at", { withTimezone: true }),
  consentMethod: varchar("consent_method", { length: 100 }),
  consentEvidence: text("consent_evidence"),

  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revocationMethod: varchar("revocation_method", { length: 100 }),

  legalBasis: varchar("legal_basis", { length: 100 }).default("legitimate_interest"),
  privacyNoticeVersion: varchar("privacy_notice_version", { length: 20 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("consent_practice_client_idx").on(t.practiceId, t.clientId),
  index("consent_channel_idx").on(t.channel),
]);

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").references(() => practices.id),

  name: varchar("name", { length: 255 }).notNull(),
  language: varchar("language", { length: 10 }).default("en_GB"),
  category: varchar("category", { length: 50 }).default("UTILITY"),

  headerText: text("header_text"),
  bodyText: text("body_text").notNull(),
  footerText: text("footer_text"),

  buttons: jsonb("buttons").default([]),
  variables: jsonb("variables").default([]),

  status: whatsappTemplateStatusEnum("status").default("draft"),
  twilioTemplateSid: varchar("twilio_template_sid", { length: 255 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  escalationLevel: escalationLevelEnum("escalation_level"),

  isSystem: boolean("is_system").default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("wa_templates_practice_id_idx").on(t.practiceId),
]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),

  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),

  userId: uuid("user_id").references(() => users.id),
  clientId: uuid("client_id").references(() => clients.id),

  changes: jsonb("changes"),
  metadata: jsonb("metadata"),

  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("audit_practice_id_idx").on(t.practiceId),
  index("audit_entity_idx").on(t.entityType, t.entityId),
  index("audit_created_at_idx").on(t.createdAt),
]);

// ============================================================
// XERO INTEGRATION
// ============================================================

export const xeroConnectionStatusEnum = pgEnum("xero_connection_status", [
  "active", "expired", "revoked",
]);

export const xeroConnections = pgTable("xero_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  practiceId: uuid("practice_id").notNull().references(() => practices.id),

  xeroTenantId: varchar("xero_tenant_id", { length: 255 }).notNull(),
  xeroTenantName: varchar("xero_tenant_name", { length: 255 }),
  connectionId: varchar("connection_id", { length: 255 }).notNull(),

  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),

  scopes: text("scopes"),
  status: xeroConnectionStatusEnum("status").default("active").notNull(),

  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow().notNull(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("xero_connections_practice_idx").on(t.practiceId),
  uniqueIndex("xero_connections_tenant_idx").on(t.xeroTenantId),
]);

// ============================================================
// RELATIONS
// ============================================================

export const practicesRelations = relations(practices, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  campaigns: many(chaseCampaigns),
  documentTemplates: many(documentTemplates),
  whatsappTemplates: many(whatsappTemplates),
  xeroConnections: many(xeroConnections),
}));

export const xeroConnectionsRelations = relations(xeroConnections, ({ one }) => ({
  practice: one(practices, { fields: [xeroConnections.practiceId], references: [practices.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  practice: one(practices, { fields: [users.practiceId], references: [practices.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  practice: one(practices, { fields: [clients.practiceId], references: [practices.id] }),
  documents: many(clientDocuments),
  enrollments: many(chaseEnrollments),
  consentRecords: many(consentRecords),
  magicLinks: many(magicLinks),
}));

export const campaignsRelations = relations(chaseCampaigns, ({ one, many }) => ({
  practice: one(practices, { fields: [chaseCampaigns.practiceId], references: [practices.id] }),
  createdByUser: one(users, { fields: [chaseCampaigns.createdBy], references: [users.id] }),
  enrollments: many(chaseEnrollments),
  messages: many(chaseMessages),
  documents: many(clientDocuments),
}));

export const enrollmentsRelations = relations(chaseEnrollments, ({ one, many }) => ({
  practice: one(practices, { fields: [chaseEnrollments.practiceId], references: [practices.id] }),
  campaign: one(chaseCampaigns, { fields: [chaseEnrollments.campaignId], references: [chaseCampaigns.id] }),
  client: one(clients, { fields: [chaseEnrollments.clientId], references: [clients.id] }),
  messages: many(chaseMessages),
  documents: many(clientDocuments),
}));

export const messagesRelations = relations(chaseMessages, ({ one }) => ({
  practice: one(practices, { fields: [chaseMessages.practiceId], references: [practices.id] }),
  enrollment: one(chaseEnrollments, { fields: [chaseMessages.enrollmentId], references: [chaseEnrollments.id] }),
  client: one(clients, { fields: [chaseMessages.clientId], references: [clients.id] }),
  campaign: one(chaseCampaigns, { fields: [chaseMessages.campaignId], references: [chaseCampaigns.id] }),
  magicLink: one(magicLinks, { fields: [chaseMessages.magicLinkId], references: [magicLinks.id] }),
  whatsappTemplate: one(whatsappTemplates, { fields: [chaseMessages.whatsappTemplateId], references: [whatsappTemplates.id] }),
}));

export const documentsRelations = relations(clientDocuments, ({ one }) => ({
  practice: one(practices, { fields: [clientDocuments.practiceId], references: [practices.id] }),
  client: one(clients, { fields: [clientDocuments.clientId], references: [clients.id] }),
  template: one(documentTemplates, { fields: [clientDocuments.templateId], references: [documentTemplates.id] }),
  campaign: one(chaseCampaigns, { fields: [clientDocuments.campaignId], references: [chaseCampaigns.id] }),
  enrollment: one(chaseEnrollments, { fields: [clientDocuments.enrollmentId], references: [chaseEnrollments.id] }),
  reviewer: one(users, { fields: [clientDocuments.reviewedBy], references: [users.id] }),
}));

export const magicLinksRelations = relations(magicLinks, ({ one }) => ({
  practice: one(practices, { fields: [magicLinks.practiceId], references: [practices.id] }),
  client: one(clients, { fields: [magicLinks.clientId], references: [clients.id] }),
  enrollment: one(chaseEnrollments, { fields: [magicLinks.enrollmentId], references: [chaseEnrollments.id] }),
}));

export const consentRelations = relations(consentRecords, ({ one }) => ({
  practice: one(practices, { fields: [consentRecords.practiceId], references: [practices.id] }),
  client: one(clients, { fields: [consentRecords.clientId], references: [clients.id] }),
}));
