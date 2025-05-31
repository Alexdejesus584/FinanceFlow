import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  boolean,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // 'admin' or 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  cpfCnpj: varchar("cpf_cnpj"),
  pixKey: varchar("pix_key"),
  notes: text("notes"),
  status: varchar("status").notNull().default("active"), // 'active', 'inactive', 'pending'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billings table
export const billings = pgTable("billings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  billingTypeId: integer("billing_type_id").references(() => billingTypes.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: varchar("description").notNull(),
  dueDate: date("due_date").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'paid', 'overdue', 'cancelled'
  recurrenceType: varchar("recurrence_type").default("none"), // 'none', 'daily', 'weekly', 'monthly', 'yearly'
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceEndDate: date("recurrence_end_date"),
  parentBillingId: integer("parent_billing_id").references(() => billings.id),
  pixKey: varchar("pix_key"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message templates table
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  content: text("content").notNull(),
  triggerType: varchar("trigger_type").notNull(), // 'before_due', 'after_due', 'manual'
  triggerDays: integer("trigger_days").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message history table
export const messageHistory = pgTable("message_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  billingId: integer("billing_id").references(() => billings.id),
  templateId: integer("template_id").references(() => messageTemplates.id),
  content: text("content").notNull(),
  method: varchar("method").notNull(), // 'email', 'whatsapp'
  status: varchar("status").notNull(), // 'sent', 'failed', 'pending'
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  billingId: integer("billing_id").references(() => billings.id),
  title: varchar("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isAllDay: boolean("is_all_day").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evolution API instances table
export const evolutionInstances = pgTable("evolution_instances", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  baseUrl: varchar("base_url").notNull(),
  apiKey: varchar("api_key").notNull(),
  instanceName: varchar("instance_name").notNull(),
  status: varchar("status").default("inactive"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Billing types table for custom billing types
export const billingTypes = pgTable("billing_types", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  description: text("description"),
  defaultAmount: decimal("default_amount", { precision: 10, scale: 2 }),
  color: varchar("color").default("#8B5CF6"), // Purple default
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  billings: many(billings),
  messageTemplates: many(messageTemplates),
  messageHistory: many(messageHistory),
  calendarEvents: many(calendarEvents),
  evolutionInstances: many(evolutionInstances),
  billingTypes: many(billingTypes),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  billings: many(billings),
  messageHistory: many(messageHistory),
}));

export const billingsRelations = relations(billings, ({ one, many }) => ({
  user: one(users, {
    fields: [billings.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [billings.customerId],
    references: [customers.id],
  }),
  billingType: one(billingTypes, {
    fields: [billings.billingTypeId],
    references: [billingTypes.id],
  }),
  parentBilling: one(billings, {
    fields: [billings.parentBillingId],
    references: [billings.id],
  }),
  childBillings: many(billings),
  messageHistory: many(messageHistory),
  calendarEvents: many(calendarEvents),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one, many }) => ({
  user: one(users, {
    fields: [messageTemplates.userId],
    references: [users.id],
  }),
  messageHistory: many(messageHistory),
}));

export const messageHistoryRelations = relations(messageHistory, ({ one }) => ({
  user: one(users, {
    fields: [messageHistory.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [messageHistory.customerId],
    references: [customers.id],
  }),
  billing: one(billings, {
    fields: [messageHistory.billingId],
    references: [billings.id],
  }),
  template: one(messageTemplates, {
    fields: [messageHistory.templateId],
    references: [messageTemplates.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  billing: one(billings, {
    fields: [calendarEvents.billingId],
    references: [billings.id],
  }),
}));

export const evolutionInstancesRelations = relations(evolutionInstances, ({ one }) => ({
  user: one(users, {
    fields: [evolutionInstances.userId],
    references: [users.id],
  }),
}));

export const billingTypesRelations = relations(billingTypes, ({ one, many }) => ({
  user: one(users, {
    fields: [billingTypes.userId],
    references: [users.id],
  }),
  billings: many(billings),
}));

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingSchema = createInsertSchema(billings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvolutionInstanceSchema = createInsertSchema(evolutionInstances).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillingTypeSchema = createInsertSchema(billingTypes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertBilling = z.infer<typeof insertBillingSchema>;
export type Billing = typeof billings.$inferSelect;
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertEvolutionInstance = z.infer<typeof insertEvolutionInstanceSchema>;
export type EvolutionInstance = typeof evolutionInstances.$inferSelect;
export type MessageHistory = typeof messageHistory.$inferSelect;
