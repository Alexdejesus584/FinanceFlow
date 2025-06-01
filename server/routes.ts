import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { EvolutionAPIClient } from "./evolution-api";
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
import { statusSyncService } from "./status-sync";

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
      console.log("Creating evolution settings for user:", userId);
      console.log("Request body:", req.body);
      
      const validatedData = insertEvolutionSettingsSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const settings = await storage.createEvolutionSettings({
        ...validatedData,
        userId,
      });
      
      console.log("Settings created successfully:", settings);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creating evolution settings:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
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
      console.log("Updating evolution settings for user:", userId, "ID:", id);
      console.log("Request body:", req.body);
      
      const validatedData = insertEvolutionSettingsSchema.partial().parse(req.body);
      console.log("Validated data:", validatedData);
      
      const settings = await storage.updateEvolutionSettings(id, validatedData, userId);
      
      if (!settings) {
        return res.status(404).json({ message: "Evolution settings not found" });
      }
      
      console.log("Settings updated successfully:", settings);
      res.json(settings);
    } catch (error) {
      console.error("Error updating evolution settings:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
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
      const { instanceName, token, channel, phoneNumber } = req.body;
      
      // Buscar configurações globais do usuário
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API not configured. Please configure global settings first." });
      }

      // Criar cliente da Evolution API
      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey.trim()
      });

      // Criar instância na Evolution API primeiro
      const instanceData = {
        instanceName: instanceName.trim()
      };
      
      if (token && token.trim()) {
        instanceData.token = token.trim();
      }

      console.log("Creating Evolution API instance:", instanceData);
      const evolutionResponse = await evolutionClient.createInstance(instanceData);
      console.log("Evolution API response:", JSON.stringify(evolutionResponse, null, 2));

      // Salvar instância no banco de dados local com dados da Evolution API
      const dbInstance = await storage.createEvolutionInstance({
        instanceName: evolutionResponse.instance?.instanceName || instanceName,
        token: evolutionResponse.hash?.apikey || token || '',
        channel: channel || 'whatsapp-web',
        phoneNumber: phoneNumber || null,
        status: 'created',
        isConnected: false,
        qrCode: null,
        userId
      });

      res.status(201).json(dbInstance);
    } catch (error) {
      console.error("Error creating evolution instance:", error);
      res.status(500).json({ 
        message: "Failed to create evolution instance",
        error: error.message 
      });
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

  // Sincronizar status da instância
  app.post('/api/evolution-instances/:id/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      await statusSyncService.syncInstanceStatus(id, userId);
      
      res.json({ message: "Instance status synchronized successfully" });
    } catch (error) {
      console.error("Error syncing instance status:", error);
      res.status(500).json({ message: "Failed to sync instance status" });
    }
  });

  app.post('/api/evolution-instances/:id/connect', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/evolution-instances/:id/disconnect', isAuthenticated, async (req: any, res) => {
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

  // Criar instância real na Evolution API
  app.post('/api/evolution-instances/create-real', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { instanceName, token, phoneNumber } = req.body;
      
      // Buscar configurações globais do usuário
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API not configured. Please configure global settings first." });
      }

      // Criar cliente da Evolution API
      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey.trim()
      });

      // Criar instância na Evolution API - usando apenas parâmetros básicos
      const instanceData = {
        instanceName: instanceName.trim()
      };
      
      // Adicionar token apenas se fornecido
      if (token && token.trim()) {
        instanceData.token = token.trim();
      }

      console.log("Creating Evolution API instance:", instanceData);
      const evolutionResponse = await evolutionClient.createInstance(instanceData);
      console.log("Evolution API response:", evolutionResponse);

      // Salvar instância no banco de dados
      const dbInstance = await storage.createEvolutionInstance({
        instanceName,
        token: evolutionResponse.hash?.apikey || token,
        channel: 'whatsapp-web',
        phoneNumber: phoneNumber || null,
        status: 'created',
        isConnected: false,
        qrCode: null,
        userId
      });

      res.json({
        instance: dbInstance,
        evolutionData: evolutionResponse
      });
    } catch (error) {
      console.error("Error creating Evolution API instance:", error);
      res.status(500).json({ 
        message: "Failed to create Evolution API instance",
        error: error.message 
      });
    }
  });

  // Conectar instância na Evolution API
  app.post('/api/evolution-instances/:id/connect-real', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const instance = await storage.getEvolutionInstance(id, userId);
      if (!instance) {
        return res.status(404).json({ message: "Instance not found" });
      }

      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API not configured" });
      }

      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey.trim()
      });

      const connectResponse = await evolutionClient.connectInstance(instance.instanceName);
      
      // Atualizar status no banco
      await storage.updateEvolutionInstance(id, {
        isConnected: true,
        status: 'connecting'
      }, userId);

      res.json({
        message: "Instance connection initiated",
        qrCode: connectResponse.qrcode,
        response: connectResponse
      });
    } catch (error) {
      console.error("Error connecting Evolution API instance:", error);
      res.status(500).json({ 
        message: "Failed to connect Evolution API instance",
        error: error.message 
      });
    }
  });

  // Obter QR Code da instância
  app.get('/api/evolution-instances/:id/qrcode', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const instance = await storage.getEvolutionInstance(id, userId);
      if (!instance) {
        return res.status(404).json({ message: "Instance not found" });
      }

      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API not configured" });
      }

      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey.trim()
      });

      // Primeiro buscar todas as instâncias para encontrar o nome real
      const allInstances = await evolutionClient.listInstances();
      
      // Encontrar a instância pelo nome (ignorando espaços)
      const realInstance = allInstances.find(inst => 
        inst.name && inst.name.trim() === instance.instanceName.trim()
      );
      
      if (!realInstance) {
        return res.status(404).json({ 
          message: "Instance not found in Evolution API",
          instanceName: instance.instanceName 
        });
      }

      // Verificar se a instância já está conectada
      if (realInstance.connectionStatus === 'open') {
        // Atualizar status local
        await storage.updateEvolutionInstance(id, {
          isConnected: true,
          status: 'connected'
        }, userId);

        return res.status(400).json({ 
          message: "Instance is already connected",
          isConnected: true,
          status: 'connected'
        });
      }

      // Usar o nome real da instância da Evolution API
      const qrResponse = await evolutionClient.getQRCode(realInstance.name);
      
      // Log detalhado para debug
      console.log('QR Response from Evolution API:', JSON.stringify(qrResponse, null, 2));
      
      // Extrair QR Code de diferentes possíveis formatos
      let qrCodeData = null;
      if (qrResponse.base64) {
        qrCodeData = qrResponse.base64;
        console.log('QR Code found in base64 field');
      } else if (qrResponse.qrcode) {
        qrCodeData = qrResponse.qrcode;
        console.log('QR Code found in qrcode field');
      } else if (qrResponse.qrCode) {
        qrCodeData = qrResponse.qrCode;
        console.log('QR Code found in qrCode field');
      } else if (qrResponse.data && qrResponse.data.base64) {
        qrCodeData = qrResponse.data.base64;
        console.log('QR Code found in data.base64 field');
      } else if (qrResponse.data && qrResponse.data.qrcode) {
        qrCodeData = qrResponse.data.qrcode;
        console.log('QR Code found in data.qrcode field');
      } else if (qrResponse.instance && qrResponse.instance.qrcode) {
        qrCodeData = qrResponse.instance.qrcode;
        console.log('QR Code found in instance.qrcode field');
      } else {
        console.log('QR Code NOT found in any expected field');
      }
      
      // Criar resposta simples e direta
      const responseData = {
        qrCode: qrCodeData
      };
      
      console.log('Sending response to frontend:');
      console.log('- qrCode length:', qrCodeData ? qrCodeData.length : 'null');
      console.log('- qrCode preview:', qrCodeData ? qrCodeData.substring(0, 50) + '...' : 'null');
      console.log('- Response data:', JSON.stringify(responseData).substring(0, 100) + '...');
      
      // Enviar resposta sem campos extras que podem causar problemas de serialização
      res.status(200).json(responseData);
    } catch (error) {
      console.error("Error getting QR code:", error);
      res.status(500).json({ 
        message: "Failed to get QR code",
        error: error.message 
      });
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
      const { customerId, templateId, content, method, instanceId } = req.body;
      
      const customer = await storage.getCustomer(customerId, userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      let success = false;
      
      if (method === 'whatsapp' && instanceId) {
        // Enviar via instância Evolution API específica
        const instance = await storage.getEvolutionInstance(instanceId, userId);
        if (!instance || !instance.isConnected) {
          return res.status(400).json({ message: "WhatsApp instance not found or not connected" });
        }
        
        const settings = await storage.getEvolutionSettings(userId);
        if (!settings) {
          return res.status(400).json({ message: "Evolution API settings not configured" });
        }
        
        const evolutionClient = new EvolutionAPIClient({
          baseUrl: settings.globalApiUrl,
          globalApiKey: settings.globalApiKey,
        });
        
        // Formatar número do WhatsApp
        const phone = customer.phone?.replace(/\D/g, '') || '';
        const formattedPhone = phone.length === 11 ? `55${phone}` : phone;
        
        if (!phone) {
          return res.status(400).json({ message: "Customer phone number not available" });
        }
        
        try {
          const whatsappResponse = await evolutionClient.sendTextMessage(
            instance.instanceName,
            `${formattedPhone}@s.whatsapp.net`,
            content
          );
          
          success = whatsappResponse && !whatsappResponse.error;
        } catch (error) {
          console.error("Error sending WhatsApp message:", error);
          success = false;
        }
      } else {
        // Enviar via email service (método padrão)
        success = await emailService.sendMessage(customer, content, method);
      }
      
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

  // Dispatch message to WhatsApp number
  app.post('/api/dispatch-message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { phone, content, instanceId, scheduledFor } = req.body;
      
      if (!phone || !content || !instanceId) {
        return res.status(400).json({ message: "Phone, content and instanceId are required" });
      }

      const instance = await storage.getEvolutionInstance(instanceId, userId);
      if (!instance || !instance.isConnected) {
        return res.status(400).json({ message: "WhatsApp instance not found or not connected" });
      }
      
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API settings not configured" });
      }
      
      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey,
      });
      
      // Format WhatsApp number
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 11 && cleanPhone.startsWith('1') 
        ? `55${cleanPhone}` 
        : cleanPhone.length === 10 
        ? `5511${cleanPhone}` 
        : cleanPhone;
      
      try {
        const whatsappResponse = await evolutionClient.sendTextMessage(
          instance.instanceName,
          `${formattedPhone}@s.whatsapp.net`,
          content
        );
        
        const success = whatsappResponse && !whatsappResponse.error;
        
        // Create message history for dispatched message
        await storage.createMessageHistory({
          userId,
          customerId: null, // No customer for direct dispatch
          templateId: null,
          content,
          method: 'whatsapp',
          status: success ? 'sent' : 'failed',
          sentAt: success ? new Date() : undefined,
        });
        
        res.json({ 
          success, 
          message: success ? 'Message dispatched successfully' : 'Failed to dispatch message',
          phone: formattedPhone
        });
      } catch (error) {
        console.error("Error dispatching WhatsApp message:", error);
        
        await storage.createMessageHistory({
          userId,
          customerId: null,
          templateId: null,
          content,
          method: 'whatsapp',
          status: 'failed',
          sentAt: undefined,
        });
        
        res.status(500).json({ message: "Failed to dispatch WhatsApp message" });
      }
    } catch (error) {
      console.error("Error in dispatch message:", error);
      res.status(500).json({ message: "Failed to dispatch message" });
    }
  });

  // Send billing notifications via WhatsApp
  app.post('/api/send-billing-notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { billingIds, instanceId } = req.body;
      
      if (!billingIds || !Array.isArray(billingIds) || !instanceId) {
        return res.status(400).json({ message: "billingIds array and instanceId are required" });
      }

      const instance = await storage.getEvolutionInstance(instanceId, userId);
      if (!instance || !instance.isConnected) {
        return res.status(400).json({ message: "WhatsApp instance not found or not connected" });
      }
      
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return res.status(400).json({ message: "Evolution API settings not configured" });
      }
      
      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey,
      });
      
      const results = [];
      
      for (const billingId of billingIds) {
        try {
          const billing = await storage.getBilling(billingId, userId);
          if (!billing) {
            results.push({ billingId, success: false, error: "Billing not found" });
            continue;
          }

          const customer = await storage.getCustomer(billing.customerId, userId);
          if (!customer || !customer.phone) {
            results.push({ billingId, success: false, error: "Customer phone not available" });
            continue;
          }

          // Format phone number
          const phone = customer.phone.replace(/\D/g, '');
          const formattedPhone = phone.length === 11 ? `55${phone}` : phone;
          
          // Generate billing message using template or default format
          const message = `Olá ${customer.name}!\n\nVocê tem uma cobrança pendente:\n\n💰 Valor: R$ ${billing.amount.toFixed(2)}\n📅 Vencimento: ${new Date(billing.dueDate).toLocaleDateString('pt-BR')}\n📝 Descrição: ${billing.description}\n\nPor favor, efetue o pagamento até a data de vencimento.\n\nObrigado!`;

          const whatsappResponse = await evolutionClient.sendTextMessage(
            instance.instanceName,
            `${formattedPhone}@s.whatsapp.net`,
            message
          );
          
          const success = whatsappResponse && !whatsappResponse.error;
          
          // Create message history
          await storage.createMessageHistory({
            userId,
            customerId: customer.id,
            templateId: null,
            content: message,
            method: 'whatsapp',
            status: success ? 'sent' : 'failed',
            sentAt: success ? new Date() : undefined,
          });
          
          results.push({ 
            billingId, 
            success, 
            customerName: customer.name,
            amount: billing.amount 
          });
          
        } catch (error) {
          console.error(`Error sending billing ${billingId}:`, error);
          results.push({ billingId, success: false, error: "Failed to send message" });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      
      res.json({ 
        success: true,
        results,
        summary: {
          total: billingIds.length,
          sent: successCount,
          failed: billingIds.length - successCount
        }
      });
      
    } catch (error) {
      console.error("Error sending billing notifications:", error);
      res.status(500).json({ message: "Failed to send billing notifications" });
    }
  });

  // Inicializar scheduler
  scheduler.start();
  
  // Inicializar sincronização de status das instâncias
  statusSyncService.startSync();

  const httpServer = createServer(app);
  return httpServer;
}
