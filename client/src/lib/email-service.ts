// Client-side email service utilities
export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  reminderDaysBefore: number;
  overdueReminderDays: number;
}

export class ClientEmailService {
  private static instance: ClientEmailService;

  public static getInstance(): ClientEmailService {
    if (!ClientEmailService.instance) {
      ClientEmailService.instance = new ClientEmailService();
    }
    return ClientEmailService.instance;
  }

  /**
   * Generate email template with variable substitution
   */
  generateEmailTemplate(
    template: string, 
    variables: Record<string, string>
  ): string {
    let processedTemplate = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value);
    });
    
    return processedTemplate;
  }

  /**
   * Extract available variables from template content
   */
  extractVariables(template: string): string[] {
    const regex = /{([^}]+)}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  /**
   * Validate email template
   */
  validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!template || template.trim().length === 0) {
      errors.push("Template não pode estar vazio");
    }
    
    if (template.length > 5000) {
      errors.push("Template muito longo (máximo 5000 caracteres)");
    }
    
    // Check for unclosed variables
    const openBraces = (template.match(/{/g) || []).length;
    const closeBraces = (template.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push("Variáveis mal formatadas - verifique as chaves { }");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format currency for templates
   */
  formatCurrency(value: number | string): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  }

  /**
   * Format date for templates
   */
  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Get common template variables
   */
  getCommonVariables(): Record<string, string> {
    return {
      nome: "Nome do cliente",
      valor: "Valor da cobrança",
      data: "Data de vencimento",
      chave_pix: "Chave PIX",
      descricao: "Descrição da cobrança",
      empresa: "Nome da empresa",
      telefone: "Telefone de contato",
      email: "E-mail de contato"
    };
  }

  /**
   * Preview template with sample data
   */
  previewTemplate(template: string): string {
    const sampleData = {
      nome: "João Silva",
      valor: this.formatCurrency(150),
      data: this.formatDate(new Date()),
      chave_pix: "11999887766",
      descricao: "Mensalidade",
      empresa: "Sua Empresa",
      telefone: "(11) 99999-9999",
      email: "contato@empresa.com"
    };
    
    return this.generateEmailTemplate(template, sampleData);
  }

  /**
   * Get default email templates
   */
  getDefaultTemplates(): Record<string, EmailTemplate> {
    return {
      reminder: {
        subject: "Lembrete: Cobrança vencendo em breve",
        body: `Olá {nome}!

Esperamos que esteja bem. Este é um lembrete de que sua cobrança está próxima do vencimento:

• Descrição: {descricao}
• Valor: {valor}
• Vencimento: {data}

Para facilitar o pagamento, você pode utilizar nossa chave PIX:
{chave_pix}

Se já efetuou o pagamento, pode desconsiderar este e-mail.

Atenciosamente,
{empresa}
Telefone: {telefone}
E-mail: {email}`
      },
      overdue: {
        subject: "Urgente: Cobrança em atraso",
        body: `Olá {nome}!

Nossa cobrança está em atraso e precisa de sua atenção:

• Descrição: {descricao}
• Valor: {valor}
• Vencimento: {data}

Para regularizar sua situação, utilize nossa chave PIX:
{chave_pix}

Entre em contato conosco se houver alguma dúvida.

Atenciosamente,
{empresa}
Telefone: {telefone}
E-mail: {email}`
      },
      confirmation: {
        subject: "Confirmação de pagamento recebido",
        body: `Olá {nome}!

Confirmamos o recebimento do seu pagamento:

• Descrição: {descricao}
• Valor: {valor}
• Data do pagamento: {data}

Agradecemos pela pontualidade!

Atenciosamente,
{empresa}
Telefone: {telefone}
E-mail: {email}`
      }
    };
  }
}

export const emailService = ClientEmailService.getInstance();
