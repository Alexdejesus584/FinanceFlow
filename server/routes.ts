import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertCustomerSchema, 
  insertBillingSchema, 
  insertMessageTemplateSchema,
  insertCalendarEventSchema,
  insertEvolutionInstanceSchema,
  insertEvolutionSettingsSchema 
} from "@shared/schema";
import { z } from "zod";
import { emailService } from "./email-service";
import { scheduler } from "./scheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Start scheduler for automated tasks
  scheduler.start();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Customer routes
  app.get('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customers = await storage.getCustomers(userId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer({ ...validatedData, userId });
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  });

  app.put('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, validatedData, userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update customer" });
      }
    }
  });

  app.delete('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteCustomer(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Billing routes
  app.get('/api/billings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, startDate, endDate } = req.query;
      
      let billings;
      if (status) {
        billings = await storage.getBillingsByStatus(status as string, userId);
      } else if (startDate && endDate) {
        billings = await storage.getBillingsByDateRange(startDate as string, endDate as string, userId);
      } else {
        billings = await storage.getBillings(userId);
      }
      
      res.json(billings);
    } catch (error) {
      console.error("Error fetching billings:", error);
      res.status(500).json({ message: "Failed to fetch billings" });
    }
  });

  app.post('/api/billings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertBillingSchema.parse(req.body);
      const billing = await storage.createBilling({ ...validatedData, userId });
      
      // Create calendar event for the billing
      await storage.createCalendarEvent({
        userId,
        billingId: billing.id,
        title: `${validatedData.description} - ${validatedData.amount}`,
        description: `Cobrança: ${validatedData.description}`,
        startDate: new Date(`${validatedData.dueDate}T09:00:00`),
        isAllDay: false,
      });
      
      res.status(201).json(billing);
    } catch (error) {
      console.error("Error creating billing:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create billing" });
      }
    }
  });

  app.put('/api/billings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = insertBillingSchema.partial().parse(req.body);
      
      // If status is being changed to paid, set paidAt
      if (validatedData.status === 'paid' && !validatedData.paidAt) {
        validatedData.paidAt = new Date();
      }
      
      const billing = await storage.updateBilling(id, validatedData, userId);
      
      if (!billing) {
        return res.status(404).json({ message: "Billing not found" });
      }
      
      res.json(billing);
    } catch (error) {
      console.error("Error updating billing:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update billing" });
      }
    }
  });

  app.delete('/api/billings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteBilling(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Billing not found" });
      }
      
      res.json({ message: "Billing deleted successfully" });
    } catch (error) {
      console.error("Error deleting billing:", error);
      res.status(500).json({ message: "Failed to delete billing" });
    }
  });

  // Billing types routes
  app.get('/api/billing-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const billingTypes = await storage.getBillingTypes(userId);
      res.json(billingTypes);
    } catch (error) {
      console.error("Error fetching billing types:", error);
      res.status(500).json({ message: "Failed to fetch billing types" });
    }
  });

  // Evolution API settings routes
  app.get('/api/evolution-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getEvolutionSettings(userId);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching evolution settings:", error);
      res.status(500).json({ message: "Failed to fetch evolution settings" });
    }
  });

  app.post('/api/evolution-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEvolutionSettingsSchema.parse(req.body);
      
      const settings = await storage.createEvolutionSettings({
        ...validatedData,
        userId,
      });
      
      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creating evolution settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create evolution settings" });
      }
    }
  });

  app.put('/api/evolution-settings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = insertEvolutionSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateEvolutionSettings(id, validatedData, userId);
      
      if (!settings) {
        return res.status(404).json({ message: "Evolution settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating evolution settings:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update evolution settings" });
      }
    }
  });

  // Evolution API instances routes
  app.get('/api/evolution-instances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const instances = await storage.getEvolutionInstances(userId);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching evolution instances:", error);
      res.status(500).json({ message: "Failed to fetch evolution instances" });
    }
  });

  app.post('/api/evolution-instances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEvolutionInstanceSchema.parse(req.body);
      
      const instance = await storage.createEvolutionInstance({
        ...validatedData,
        userId,
      });
      
      res.status(201).json(instance);
    } catch (error) {
      console.error("Error creating evolution instance:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create evolution instance" });
      }
    }
  });

  app.put('/api/evolution-instances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = insertEvolutionInstanceSchema.partial().parse(req.body);
      
      const instance = await storage.updateEvolutionInstance(id, validatedData, userId);
      
      if (!instance) {
        return res.status(404).json({ message: "Evolution instance not found" });
      }
      
      res.json(instance);
    } catch (error) {
      console.error("Error updating evolution instance:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update evolution instance" });
      }
    }
  });

  app.delete('/api/evolution-instances/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteEvolutionInstance(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Evolution instance not found" });
      }
      
      res.json({ message: "Evolution instance deleted successfully" });
    } catch (error) {
      console.error("Error deleting evolution instance:", error);
      res.status(500).json({ message: "Failed to delete evolution instance" });
    }
  });

  app.patch('/api/evolution-instances/:id/connect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.connectEvolutionInstance(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Evolution instance not found" });
      }
      
      res.json({ message: "Evolution instance connected successfully" });
    } catch (error) {
      console.error("Error connecting evolution instance:", error);
      res.status(500).json({ message: "Failed to connect evolution instance" });
    }
  });

  app.patch('/api/evolution-instances/:id/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.disconnectEvolutionInstance(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Evolution instance not found" });
      }
      
      res.json({ message: "Evolution instance disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting evolution instance:", error);
      res.status(500).json({ message: "Failed to disconnect evolution instance" });
    }
  });

  // Message template routes
  app.get('/api/message-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getMessageTemplates(userId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching message templates:", error);
      res.status(500).json({ message: "Failed to fetch message templates" });
    }
  });

  app.post('/api/message-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMessageTemplateSchema.parse(req.body);
      const template = await storage.createMessageTemplate({ ...validatedData, userId });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating message template:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create message template" });
      }
    }
  });

  app.put('/api/message-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = insertMessageTemplateSchema.partial().parse(req.body);
      const template = await storage.updateMessageTemplate(id, validatedData, userId);
      
      if (!template) {
        return res.status(404).json({ message: "Message template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error updating message template:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update message template" });
      }
    }
  });

  app.delete('/api/message-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteMessageTemplate(id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Message template not found" });
      }
      
      res.json({ message: "Message template deleted successfully" });
    } catch (error) {
      console.error("Error deleting message template:", error);
      res.status(500).json({ message: "Failed to delete message template" });
    }
  });

  // Message history routes
  app.get('/api/message-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getMessageHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching message history:", error);
      res.status(500).json({ message: "Failed to fetch message history" });
    }
  });

  // Calendar events routes
  app.get('/api/calendar-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const events = await storage.getCalendarEvents(
        userId, 
        startDate as string, 
        endDate as string
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar-events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent({ ...validatedData, userId });
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create calendar event" });
      }
    }
  });

  // Dashboard statistics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Send message manually
  app.post('/api/send-message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { customerId, templateId, content, method } = req.body;
      
      const customer = await storage.getCustomer(customerId, userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const success = await emailService.sendMessage(customer, content, method);
      
      await storage.createMessageHistory({
        userId,
        customerId,
        templateId,
        content,
        method,
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined,
      });
      
      res.json({ success, message: success ? 'Message sent successfully' : 'Failed to send message' });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
