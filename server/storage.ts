import {
  users,
  customers,
  billings,
  messageTemplates,
  messageHistory,
  calendarEvents,
  evolutionInstances,
  evolutionSettings,
  billingTypes,
  type User,
  type UpsertUser,
  type Customer,
  type InsertCustomer,
  type Billing,
  type InsertBilling,
  type MessageTemplate,
  type InsertMessageTemplate,
  type MessageHistory,
  type CalendarEvent,
  type InsertCalendarEvent,
  type EvolutionInstance,
  type InsertEvolutionInstance,
  type EvolutionSettings,
  type InsertEvolutionSettings,
  type BillingType,
  type InsertBillingType,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Customer operations
  getCustomers(userId: string): Promise<Customer[]>;
  getCustomer(id: number, userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer & { userId: string }): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>, userId: string): Promise<Customer | undefined>;
  deleteCustomer(id: number, userId: string): Promise<boolean>;

  // Billing operations
  getBillings(userId: string): Promise<(Billing & { customer: Customer })[]>;
  getBilling(id: number, userId: string): Promise<(Billing & { customer: Customer }) | undefined>;
  createBilling(billing: InsertBilling & { userId: string }): Promise<Billing>;
  updateBilling(id: number, billing: Partial<InsertBilling>, userId: string): Promise<Billing | undefined>;
  deleteBilling(id: number, userId: string): Promise<boolean>;
  getBillingsByStatus(status: string, userId: string): Promise<(Billing & { customer: Customer })[]>;
  getBillingsByDateRange(startDate: string, endDate: string, userId: string): Promise<(Billing & { customer: Customer })[]>;
  getOverdueBillings(userId: string): Promise<(Billing & { customer: Customer })[]>;

  // Message template operations
  getMessageTemplates(userId: string): Promise<MessageTemplate[]>;
  getMessageTemplate(id: number, userId: string): Promise<MessageTemplate | undefined>;
  createMessageTemplate(template: InsertMessageTemplate & { userId: string }): Promise<MessageTemplate>;
  updateMessageTemplate(id: number, template: Partial<InsertMessageTemplate>, userId: string): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(id: number, userId: string): Promise<boolean>;

  // Message history operations
  getMessageHistory(userId: string): Promise<(MessageHistory & { customer: Customer })[]>;
  createMessageHistory(message: {
    userId: string;
    customerId: number;
    billingId?: number;
    templateId?: number;
    content: string;
    method: string;
    status: string;
    sentAt?: Date;
  }): Promise<MessageHistory>;

  // Calendar event operations
  getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<(CalendarEvent & { billing?: Billing & { customer: Customer } })[]>;
  createCalendarEvent(event: InsertCalendarEvent & { userId: string }): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>, userId: string): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number, userId: string): Promise<boolean>;

  // Evolution API settings operations
  getEvolutionSettings(userId: string): Promise<EvolutionSettings | undefined>;
  createEvolutionSettings(settings: InsertEvolutionSettings & { userId: string }): Promise<EvolutionSettings>;
  updateEvolutionSettings(id: number, settings: Partial<InsertEvolutionSettings>, userId: string): Promise<EvolutionSettings | undefined>;

  // Evolution API instances operations
  getEvolutionInstances(userId: string): Promise<EvolutionInstance[]>;
  getEvolutionInstance(id: number, userId: string): Promise<EvolutionInstance | undefined>;
  createEvolutionInstance(instance: InsertEvolutionInstance & { userId: string }): Promise<EvolutionInstance>;
  updateEvolutionInstance(id: number, instance: Partial<InsertEvolutionInstance>, userId: string): Promise<EvolutionInstance | undefined>;
  deleteEvolutionInstance(id: number, userId: string): Promise<boolean>;
  connectEvolutionInstance(id: number, userId: string): Promise<boolean>;
  disconnectEvolutionInstance(id: number, userId: string): Promise<boolean>;

  // Billing types operations
  getBillingTypes(userId: string): Promise<BillingType[]>;
  getBillingType(id: number, userId: string): Promise<BillingType | undefined>;
  createBillingType(billingType: InsertBillingType & { userId: string }): Promise<BillingType>;
  updateBillingType(id: number, billingType: Partial<InsertBillingType>, userId: string): Promise<BillingType | undefined>;
  deleteBillingType(id: number, userId: string): Promise<boolean>;

  // Dashboard statistics
  getDashboardStats(userId: string): Promise<{
    totalCustomers: number;
    activeBillings: number;
    monthlyRevenue: number;
    overdueBillings: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Customer operations
  async getCustomers(userId: string): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.userId, userId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number, userId: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer & { userId: string }): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>, userId: string): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)));
    return result.rowCount > 0;
  }

  // Billing operations
  async getBillings(userId: string): Promise<(Billing & { customer: Customer })[]> {
    return await db
      .select()
      .from(billings)
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(eq(billings.userId, userId))
      .orderBy(desc(billings.dueDate));
  }

  async getBilling(id: number, userId: string): Promise<(Billing & { customer: Customer }) | undefined> {
    const [billing] = await db
      .select()
      .from(billings)
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(and(eq(billings.id, id), eq(billings.userId, userId)));
    return billing;
  }

  async createBilling(billing: InsertBilling & { userId: string }): Promise<Billing> {
    const [newBilling] = await db
      .insert(billings)
      .values(billing)
      .returning();
    return newBilling;
  }

  async updateBilling(id: number, billing: Partial<InsertBilling>, userId: string): Promise<Billing | undefined> {
    const [updatedBilling] = await db
      .update(billings)
      .set({ ...billing, updatedAt: new Date() })
      .where(and(eq(billings.id, id), eq(billings.userId, userId)))
      .returning();
    return updatedBilling;
  }

  async deleteBilling(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(billings)
      .where(and(eq(billings.id, id), eq(billings.userId, userId)));
    return result.rowCount > 0;
  }

  async getBillingsByStatus(status: string, userId: string): Promise<(Billing & { customer: Customer })[]> {
    return await db
      .select()
      .from(billings)
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(and(eq(billings.status, status), eq(billings.userId, userId)))
      .orderBy(desc(billings.dueDate));
  }

  async getBillingsByDateRange(startDate: string, endDate: string, userId: string): Promise<(Billing & { customer: Customer })[]> {
    return await db
      .select()
      .from(billings)
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(
        and(
          eq(billings.userId, userId),
          gte(billings.dueDate, startDate),
          lte(billings.dueDate, endDate)
        )
      )
      .orderBy(asc(billings.dueDate));
  }

  async getOverdueBillings(userId: string): Promise<(Billing & { customer: Customer })[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(billings)
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(
        and(
          eq(billings.userId, userId),
          eq(billings.status, 'pending'),
          lte(billings.dueDate, today)
        )
      )
      .orderBy(asc(billings.dueDate));
  }

  // Message template operations
  async getMessageTemplates(userId: string): Promise<MessageTemplate[]> {
    return await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.userId, userId))
      .orderBy(desc(messageTemplates.createdAt));
  }

  async getMessageTemplate(id: number, userId: string): Promise<MessageTemplate | undefined> {
    const [template] = await db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)));
    return template;
  }

  async createMessageTemplate(template: InsertMessageTemplate & { userId: string }): Promise<MessageTemplate> {
    const [newTemplate] = await db
      .insert(messageTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateMessageTemplate(id: number, template: Partial<InsertMessageTemplate>, userId: string): Promise<MessageTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(messageTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)))
      .returning();
    return updatedTemplate;
  }

  async deleteMessageTemplate(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.userId, userId)));
    return result.rowCount > 0;
  }

  // Message history operations
  async getMessageHistory(userId: string): Promise<(MessageHistory & { customer: Customer })[]> {
    return await db
      .select()
      .from(messageHistory)
      .leftJoin(customers, eq(messageHistory.customerId, customers.id))
      .where(eq(messageHistory.userId, userId))
      .orderBy(desc(messageHistory.createdAt));
  }

  async createMessageHistory(message: {
    userId: string;
    customerId: number;
    billingId?: number;
    templateId?: number;
    content: string;
    method: string;
    status: string;
    sentAt?: Date;
  }): Promise<MessageHistory> {
    const [newMessage] = await db
      .insert(messageHistory)
      .values(message)
      .returning();
    return newMessage;
  }

  // Calendar event operations
  async getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<(CalendarEvent & { billing?: Billing & { customer: Customer } })[]> {
    let query = db
      .select()
      .from(calendarEvents)
      .leftJoin(billings, eq(calendarEvents.billingId, billings.id))
      .leftJoin(customers, eq(billings.customerId, customers.id))
      .where(eq(calendarEvents.userId, userId));

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.startDate, new Date(startDate)),
          lte(calendarEvents.startDate, new Date(endDate))
        )
      );
    }

    return await query.orderBy(asc(calendarEvents.startDate));
  }

  async createCalendarEvent(event: InsertCalendarEvent & { userId: string }): Promise<CalendarEvent> {
    const [newEvent] = await db
      .insert(calendarEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>, userId: string): Promise<CalendarEvent | undefined> {
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set({ ...event, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
    return result.rowCount > 0;
  }

  // Dashboard statistics
  async getDashboardStats(userId: string): Promise<{
    totalCustomers: number;
    activeBillings: number;
    monthlyRevenue: number;
    overdueBillings: number;
  }> {
    const [customersCount] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.userId, userId));

    const [activeBillingsCount] = await db
      .select({ count: count() })
      .from(billings)
      .where(and(eq(billings.userId, userId), eq(billings.status, 'pending')));

    const [overdueBillingsCount] = await db
      .select({ count: count() })
      .from(billings)
      .where(
        and(
          eq(billings.userId, userId),
          eq(billings.status, 'pending'),
          lte(billings.dueDate, new Date().toISOString().split('T')[0])
        )
      );

    const currentMonth = new Date();
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const [monthlyRevenue] = await db
      .select({ sum: sql<number>`COALESCE(SUM(${billings.amount}::numeric), 0)` })
      .from(billings)
      .where(
        and(
          eq(billings.userId, userId),
          eq(billings.status, 'paid'),
          gte(billings.paidAt, firstDay),
          lte(billings.paidAt, lastDay)
        )
      );

    return {
      totalCustomers: customersCount?.count || 0,
      activeBillings: activeBillingsCount?.count || 0,
      monthlyRevenue: Number(monthlyRevenue?.sum || 0),
      overdueBillings: overdueBillingsCount?.count || 0,
    };
  }

  // Billing types operations
  async getBillingTypes(userId: string): Promise<BillingType[]> {
    return await db.select().from(billingTypes).where(eq(billingTypes.userId, userId));
  }

  async getBillingType(id: number, userId: string): Promise<BillingType | undefined> {
    const [billingType] = await db
      .select()
      .from(billingTypes)
      .where(and(eq(billingTypes.id, id), eq(billingTypes.userId, userId)));
    return billingType;
  }

  async createBillingType(billingType: InsertBillingType & { userId: string }): Promise<BillingType> {
    const [newBillingType] = await db
      .insert(billingTypes)
      .values(billingType)
      .returning();
    return newBillingType;
  }

  async updateBillingType(id: number, billingType: Partial<InsertBillingType>, userId: string): Promise<BillingType | undefined> {
    const [updatedBillingType] = await db
      .update(billingTypes)
      .set({ ...billingType, updatedAt: new Date() })
      .where(and(eq(billingTypes.id, id), eq(billingTypes.userId, userId)))
      .returning();
    return updatedBillingType;
  }

  async deleteBillingType(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(billingTypes)
      .where(and(eq(billingTypes.id, id), eq(billingTypes.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // Evolution API settings operations
  async getEvolutionSettings(userId: string): Promise<EvolutionSettings | undefined> {
    const [settings] = await db.select().from(evolutionSettings).where(eq(evolutionSettings.userId, userId));
    return settings;
  }

  async createEvolutionSettings(settings: InsertEvolutionSettings & { userId: string }): Promise<EvolutionSettings> {
    const [newSettings] = await db.insert(evolutionSettings).values(settings).returning();
    return newSettings;
  }

  async updateEvolutionSettings(id: number, settings: Partial<InsertEvolutionSettings>, userId: string): Promise<EvolutionSettings | undefined> {
    const [updatedSettings] = await db
      .update(evolutionSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(eq(evolutionSettings.id, id), eq(evolutionSettings.userId, userId)))
      .returning();
    return updatedSettings;
  }

  // Evolution API instances operations
  async getEvolutionInstances(userId: string): Promise<EvolutionInstance[]> {
    return await db.select().from(evolutionInstances).where(eq(evolutionInstances.userId, userId));
  }

  async getEvolutionInstance(id: number, userId: string): Promise<EvolutionInstance | undefined> {
    const [instance] = await db
      .select()
      .from(evolutionInstances)
      .where(and(eq(evolutionInstances.id, id), eq(evolutionInstances.userId, userId)));
    return instance;
  }

  async createEvolutionInstance(instance: InsertEvolutionInstance & { userId: string }): Promise<EvolutionInstance> {
    const [newInstance] = await db
      .insert(evolutionInstances)
      .values(instance)
      .returning();
    return newInstance;
  }

  async updateEvolutionInstance(id: number, instance: Partial<InsertEvolutionInstance>, userId: string): Promise<EvolutionInstance | undefined> {
    const [updatedInstance] = await db
      .update(evolutionInstances)
      .set({ ...instance, updatedAt: new Date() })
      .where(and(eq(evolutionInstances.id, id), eq(evolutionInstances.userId, userId)))
      .returning();
    return updatedInstance;
  }

  async deleteEvolutionInstance(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(evolutionInstances)
      .where(and(eq(evolutionInstances.id, id), eq(evolutionInstances.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  async connectEvolutionInstance(id: number, userId: string): Promise<boolean> {
    const [updatedInstance] = await db
      .update(evolutionInstances)
      .set({ 
        isConnected: true, 
        status: "connected", 
        updatedAt: new Date() 
      })
      .where(and(eq(evolutionInstances.id, id), eq(evolutionInstances.userId, userId)))
      .returning();
    return !!updatedInstance;
  }

  async disconnectEvolutionInstance(id: number, userId: string): Promise<boolean> {
    const [updatedInstance] = await db
      .update(evolutionInstances)
      .set({ 
        isConnected: false, 
        status: "disconnected", 
        updatedAt: new Date() 
      })
      .where(and(eq(evolutionInstances.id, id), eq(evolutionInstances.userId, userId)))
      .returning();
    return !!updatedInstance;
  }
}

export const storage = new DatabaseStorage();
