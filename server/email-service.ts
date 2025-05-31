import nodemailer from 'nodemailer';
import type { Customer } from '@shared/schema';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface MessageOptions {
  customer: Customer;
  content: string;
  method: 'email' | 'whatsapp';
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private static instance: EmailService;

  constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransporter() {
    try {
      // Configure email transporter based on environment variables
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      // Only create transporter if SMTP credentials are provided
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransporter(emailConfig);
        console.log('Email service initialized successfully');
      } else {
        console.log('Email service not configured - SMTP credentials missing');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email not sent - transporter not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send WhatsApp message via Evolution API
   */
  async sendWhatsApp(phone: string, message: string): Promise<boolean> {
    try {
      const apiUrl = process.env.EVOLUTION_API_URL;
      const apiKey = process.env.EVOLUTION_API_KEY;
      const instanceName = process.env.EVOLUTION_INSTANCE_NAME;

      if (!apiUrl || !apiKey || !instanceName) {
        console.log('WhatsApp not sent - Evolution API not configured');
        return false;
      }

      // Clean phone number (remove formatting)
      const cleanPhone = phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

      const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          number: `${formattedPhone}@s.whatsapp.net`,
          textMessage: {
            text: message,
          },
        }),
      });

      if (response.ok) {
        console.log('WhatsApp message sent successfully');
        return true;
      } else {
        console.error('Failed to send WhatsApp message:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Send message based on method (email or WhatsApp)
   */
  async sendMessage(customer: Customer, content: string, method: 'email' | 'whatsapp'): Promise<boolean> {
    try {
      if (method === 'email') {
        if (!customer.email) {
          console.log('Email not sent - customer email not available');
          return false;
        }

        return await this.sendEmail({
          to: customer.email,
          subject: 'Notificação de Cobrança',
          text: content,
          html: this.formatEmailContent(content, customer),
        });
      } else if (method === 'whatsapp') {
        if (!customer.phone) {
          console.log('WhatsApp not sent - customer phone not available');
          return false;
        }

        return await this.sendWhatsApp(customer.phone, content);
      }

      return false;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  /**
   * Format email content with HTML styling
   */
  private formatEmailContent(content: string, customer: Customer): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificação de Cobrança</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #a855f7;
          }
          .logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #a855f7, #8b5cf6);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          }
          .content {
            white-space: pre-line;
            margin-bottom: 32px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            background-color: #a855f7;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 16px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">B</div>
            <h1 style="margin: 0; color: #1f2937;">BillingSaaS</h1>
          </div>
          
          <div class="content">
            <p>Olá ${customer.name},</p>
            <p>${content}</p>
          </div>
          
          <div class="footer">
            <p>Esta é uma mensagem automática do sistema BillingSaaS.</p>
            <p>Se você tem alguma dúvida, entre em contato conosco.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Process template variables
   */
  processTemplate(template: string, variables: Record<string, any>): string {
    let processedTemplate = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, String(value));
    });
    
    return processedTemplate;
  }

  /**
   * Generate billing reminder content
   */
  generateBillingReminder(billing: any, customer: Customer): string {
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

    const template = `Sua cobrança "{descricao}" no valor de {valor} vence em {data}.

Para facilitar o pagamento, você pode utilizar nossa chave PIX: {chave_pix}

Se já efetuou o pagamento, pode desconsiderar esta mensagem.`;

    return this.processTemplate(template, variables);
  }

  /**
   * Generate overdue notice content
   */
  generateOverdueNotice(billing: any, customer: Customer): string {
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

    const template = `ATENÇÃO: Sua cobrança "{descricao}" no valor de {valor} está em atraso desde {data}.

Para regularizar sua situação, utilize nossa chave PIX: {chave_pix}

Entre em contato conosco se houver alguma dúvida.`;

    return this.processTemplate(template, variables);
  }

  /**
   * Verify email service configuration
   */
  async verifyConfiguration(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration verification failed:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
