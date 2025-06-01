import cron from 'node-cron';
import { storage } from './storage';
import { emailService } from './email-service';

export class Scheduler {
  private static instance: Scheduler;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    console.log('Starting scheduler...');
    
    // Check for billing reminders every hour at minute 0
    this.scheduleJob('billing-reminders', '0 * * * *', this.processBillingReminders.bind(this));
    
    // Check for overdue billings every day at 9 AM
    this.scheduleJob('overdue-notifications', '0 9 * * *', this.processOverdueNotifications.bind(this));
    
    // Generate recurring billings every day at 1 AM
    this.scheduleJob('recurring-billings', '0 1 * * *', this.generateRecurringBillings.bind(this));
    
    // Update overdue statuses every hour
    this.scheduleJob('update-overdue-status', '0 * * * *', this.updateOverdueStatuses.bind(this));
    
    // Process scheduled messages every minute
    this.scheduleJob('scheduled-messages', '* * * * *', this.processScheduledMessages.bind(this));
    
    console.log('Scheduler started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    console.log('Stopping scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    console.log('Scheduler stopped');
  }

  /**
   * Schedule a new job
   */
  private scheduleJob(name: string, cronExpression: string, handler: () => Promise<void>) {
    if (this.jobs.has(name)) {
      console.log(`Job ${name} already exists, stopping existing job`);
      this.jobs.get(name)?.stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Executing scheduled job: ${name}`);
        await handler();
        console.log(`Completed scheduled job: ${name}`);
      } catch (error) {
        console.error(`Error in scheduled job ${name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });

    this.jobs.set(name, job);
    console.log(`Scheduled job: ${name} with expression: ${cronExpression}`);
  }

  /**
   * Process billing reminders based on message templates
   */
  private async processBillingReminders() {
    try {
      console.log('Processing billing reminders...');
      
      // Get all users to process their billings
      const allBillings = await this.getAllUserBillings();
      
      for (const { userId, billings } of allBillings) {
        // Get active templates for this user
        const templates = await storage.getMessageTemplates(userId);
        const activeTemplates = templates.filter(template => 
          template.isActive && template.triggerType === 'before_due'
        );

        for (const template of activeTemplates) {
          const triggerDate = new Date();
          triggerDate.setDate(triggerDate.getDate() + (template.triggerDays || 0));
          const triggerDateStr = triggerDate.toISOString().split('T')[0];

          // Find billings that match the trigger date
          const matchingBillings = billings.filter(billing => 
            billing.status === 'pending' && 
            billing.dueDate === triggerDateStr
          );

          for (const billing of matchingBillings) {
            await this.sendBillingNotification(userId, billing, template, 'reminder');
          }
        }
      }
    } catch (error) {
      console.error('Error processing billing reminders:', error);
    }
  }

  /**
   * Process overdue notifications
   */
  private async processOverdueNotifications() {
    try {
      console.log('Processing overdue notifications...');
      
      const allBillings = await this.getAllUserBillings();
      
      for (const { userId, billings } of allBillings) {
        // Get active overdue templates for this user
        const templates = await storage.getMessageTemplates(userId);
        const overdueTemplates = templates.filter(template => 
          template.isActive && template.triggerType === 'after_due'
        );

        for (const template of overdueTemplates) {
          const triggerDate = new Date();
          triggerDate.setDate(triggerDate.getDate() - (template.triggerDays || 1));
          const triggerDateStr = triggerDate.toISOString().split('T')[0];

          // Find overdue billings that match the trigger date
          const overdueBillings = billings.filter(billing => 
            billing.status === 'pending' && 
            billing.dueDate === triggerDateStr
          );

          for (const billing of overdueBillings) {
            await this.sendBillingNotification(userId, billing, template, 'overdue');
          }
        }
      }
    } catch (error) {
      console.error('Error processing overdue notifications:', error);
    }
  }

  /**
   * Generate recurring billings
   */
  private async generateRecurringBillings() {
    try {
      console.log('Generating recurring billings...');
      
      const allBillings = await this.getAllUserBillings();
      
      for (const { userId, billings } of allBillings) {
        const recurringBillings = billings.filter(billing => 
          billing.recurrenceType && 
          billing.recurrenceType !== 'none' &&
          !billing.parentBillingId // Only process parent billings
        );

        for (const billing of recurringBillings) {
          await this.createNextRecurringBilling(userId, billing);
        }
      }
    } catch (error) {
      console.error('Error generating recurring billings:', error);
    }
  }

  /**
   * Update overdue statuses
   */
  private async updateOverdueStatuses() {
    try {
      console.log('Updating overdue statuses...');
      
      const today = new Date().toISOString().split('T')[0];
      const allBillings = await this.getAllUserBillings();
      
      for (const { userId, billings } of allBillings) {
        const overdueBillings = billings.filter(billing => 
          billing.status === 'pending' && 
          billing.dueDate < today
        );

        for (const billing of overdueBillings) {
          // Note: We don't actually change the status to 'overdue' in the database
          // The overdue status is computed in the frontend based on due date
          // This function could be used for other overdue-related tasks
          console.log(`Billing ${billing.id} is overdue (due: ${billing.dueDate})`);
        }
      }
    } catch (error) {
      console.error('Error updating overdue statuses:', error);
    }
  }

  /**
   * Get all billings for all users
   */
  private async getAllUserBillings(): Promise<Array<{ userId: string; billings: any[] }>> {
    // This is a simplified approach. In a real app, you'd want to paginate this
    // or get users from a users table and then their billings
    const result: Array<{ userId: string; billings: any[] }> = [];
    
    // Since we don't have a direct way to get all users, we'll need to implement this
    // in the storage interface if we want to process all users' billings
    // For now, we'll return empty array to prevent errors
    
    return result;
  }

  /**
   * Send billing notification
   */
  private async sendBillingNotification(
    userId: string, 
    billing: any, 
    template: any, 
    type: 'reminder' | 'overdue'
  ) {
    try {
      const customer = billing.customer;
      if (!customer) return;

      // Process template content with variables
      const variables = {
        nome: customer.name,
        valor: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(billing.amount)),
        data: new Date(billing.dueDate).toLocaleDateString('pt-BR'),
        descricao: billing.description,
        chave_pix: billing.pixKey || customer.pixKey || 'Não informado',
      };

      const content = emailService.processTemplate(template.content, variables);

      // Try to send email first
      let success = false;
      let method = 'email';

      if (customer.email) {
        success = await emailService.sendMessage(customer, content, 'email');
      }

      // If email fails or not available, try WhatsApp
      if (!success && customer.phone) {
        method = 'whatsapp';
        success = await emailService.sendMessage(customer, content, 'whatsapp');
      }

      // Log the message history
      await storage.createMessageHistory({
        userId,
        customerId: customer.id,
        billingId: billing.id,
        templateId: template.id,
        content,
        method,
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined,
      });

      if (success) {
        console.log(`Sent ${type} notification to ${customer.name} via ${method}`);
      } else {
        console.log(`Failed to send ${type} notification to ${customer.name}`);
      }
    } catch (error) {
      console.error('Error sending billing notification:', error);
    }
  }

  /**
   * Create next recurring billing
   */
  private async createNextRecurringBilling(userId: string, parentBilling: any) {
    try {
      const today = new Date();
      const dueDate = new Date(parentBilling.dueDate);
      
      // Check if it's time to create the next billing
      const shouldCreateNext = this.shouldCreateNextRecurring(parentBilling, dueDate, today);
      
      if (!shouldCreateNext) return;

      // Calculate next due date
      const nextDueDate = this.calculateNextDueDate(dueDate, parentBilling.recurrenceType, parentBilling.recurrenceInterval);
      
      // Check if we've reached the end date
      if (parentBilling.recurrenceEndDate) {
        const endDate = new Date(parentBilling.recurrenceEndDate);
        if (nextDueDate > endDate) {
          console.log(`Recurring billing ${parentBilling.id} has reached end date`);
          return;
        }
      }

      // Create new billing
      const newBilling = {
        customerId: parentBilling.customerId,
        amount: parentBilling.amount,
        description: parentBilling.description,
        dueDate: nextDueDate.toISOString().split('T')[0],
        status: 'pending',
        recurrenceType: parentBilling.recurrenceType,
        recurrenceInterval: parentBilling.recurrenceInterval,
        recurrenceEndDate: parentBilling.recurrenceEndDate,
        parentBillingId: parentBilling.id,
        pixKey: parentBilling.pixKey,
      };

      const createdBilling = await storage.createBilling({ ...newBilling, userId });
      
      // Create calendar event for the new billing
      await storage.createCalendarEvent({
        userId,
        billingId: createdBilling.id,
        title: `${newBilling.description} - R$ ${newBilling.amount}`,
        description: `Cobrança recorrente: ${newBilling.description}`,
        startDate: new Date(`${newBilling.dueDate}T09:00:00`),
        isAllDay: false,
      });

      console.log(`Created recurring billing for customer ${parentBilling.customerId}, due: ${nextDueDate.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error creating recurring billing:', error);
    }
  }

  /**
   * Check if should create next recurring billing
   */
  private shouldCreateNextRecurring(billing: any, dueDate: Date, today: Date): boolean {
    // Only create if the current billing is due or overdue
    return dueDate <= today;
  }

  /**
   * Calculate next due date for recurring billing
   */
  private calculateNextDueDate(currentDueDate: Date, recurrenceType: string, interval: number): Date {
    const nextDate = new Date(currentDueDate);
    
    switch (recurrenceType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        throw new Error(`Unsupported recurrence type: ${recurrenceType}`);
    }
    
    return nextDate;
  }

  /**
   * Process scheduled messages
   */
  private async processScheduledMessages() {
    try {
      console.log('Processing scheduled messages...');
      
      const now = new Date();
      const scheduledMessages = await this.getScheduledMessages(now);
      
      for (const message of scheduledMessages) {
        await this.sendScheduledMessage(message);
      }
      
      console.log(`Processed ${scheduledMessages.length} scheduled messages`);
    } catch (error) {
      console.error('Error processing scheduled messages:', error);
    }
  }

  /**
   * Get scheduled messages that should be sent now
   */
  private async getScheduledMessages(now: Date): Promise<any[]> {
    const { db } = await import('./db');
    const { messageHistory } = await import('@shared/schema');
    const { lte, eq, and } = await import('drizzle-orm');
    
    return await db
      .select()
      .from(messageHistory)
      .where(
        and(
          eq(messageHistory.status, 'scheduled'),
          lte(messageHistory.scheduledFor, now)
        )
      )
      .execute();
  }

  /**
   * Send a scheduled message
   */
  private async sendScheduledMessage(message: any) {
    try {
      const { storage } = await import('./storage');
      const { EvolutionAPIClient } = await import('./evolution-api');
      
      // Get user's Evolution API settings
      const settings = await storage.getEvolutionSettings(message.userId);
      if (!settings) {
        console.error(`No Evolution API settings found for user ${message.userId}`);
        return;
      }

      // Get first connected instance for the user
      const instances = await storage.getEvolutionInstances(message.userId);
      const connectedInstance = instances.find((inst: any) => inst.isConnected);
      
      if (!connectedInstance) {
        console.error(`No connected WhatsApp instance found for user ${message.userId}`);
        return;
      }

      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey,
      });

      // Send the message
      const whatsappResponse = await evolutionClient.sendTextMessage(
        connectedInstance.instanceName,
        `${message.recipientPhone}@s.whatsapp.net`,
        message.content
      );

      const success = whatsappResponse && !whatsappResponse.error;

      // Update message status
      await storage.updateMessageHistory(message.id, {
        status: success ? 'sent' : 'failed',
        sentAt: success ? new Date() : undefined
      });

      console.log(`Scheduled message ${message.id} ${success ? 'sent successfully' : 'failed'}`);
    } catch (error) {
      console.error(`Error sending scheduled message ${message.id}:`, error);
      
      // Mark as failed
      const { storage } = await import('./storage');
      await storage.updateMessageHistory(message.id, {
        status: 'failed'
      });
    }
  }

  /**
   * Get job status
   */
  getJobStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    this.jobs.forEach((job, name) => {
      status[name] = job.running;
    });
    
    return status;
  }
}

export const scheduler = Scheduler.getInstance();
