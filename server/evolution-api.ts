import fetch from 'node-fetch';

export interface EvolutionAPIConfig {
  baseUrl: string;
  globalApiKey: string;
}

export interface CreateInstanceRequest {
  instanceName: string;
  token?: string;
  qrcode?: boolean;
  number?: string;
  integration?: string;
}

export interface InstanceInfo {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  webhook?: {
    webhook: string;
  };
}

export class EvolutionAPIClient {
  private config: EvolutionAPIConfig;

  constructor(config: EvolutionAPIConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.globalApiKey,
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    console.log(`Evolution API Request: ${method} ${url}`);
    console.log('Headers:', options.headers);
    if (data) console.log('Body:', JSON.stringify(data, null, 2));

    const response = await fetch(url, options);
    const responseText = await response.text();
    
    console.log(`Evolution API Response: ${response.status}`);
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Evolution API Error: ${response.status} - ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      return responseText;
    }
  }

  // Criar uma nova instância (Evolution API v2.2.3)
  async createInstance(instanceData: CreateInstanceRequest): Promise<InstanceInfo> {
    // Para Evolution API v2.2.3, testar diferentes formatos
    const requestData = {
      instanceName: instanceData.instanceName,
      token: instanceData.token,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS" // Tentar com integração específica
    };
    
    return await this.makeRequest('/instance/create', 'POST', requestData);
  }

  // Obter informações de uma instância
  async getInstance(instanceName: string): Promise<InstanceInfo> {
    return await this.makeRequest(`/instance/fetchInstances?instanceName=${instanceName}`);
  }

  // Conectar uma instância
  async connectInstance(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/connect/${instanceName}`, 'GET');
  }

  // Obter QR Code da instância - Evolution API v2.2.3
  async getQRCode(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/connect/${instanceName}`, 'GET');
  }

  // Desconectar uma instância
  async logoutInstance(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/logout/${instanceName}`, 'DELETE');
  }

  // Obter status da instância
  async getInstanceStatus(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/connectionState/${instanceName}`, 'GET');
  }

  // Listar todas as instâncias
  async listInstances(): Promise<any> {
    return await this.makeRequest('/instance/fetchInstances');
  }

  // Deletar uma instância
  async deleteInstance(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/delete/${instanceName}`, 'DELETE');
  }

  // Reiniciar uma instância
  async restartInstance(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/restart/${instanceName}`, 'PUT');
  }

  // Verificar se o número existe no WhatsApp
  async checkWhatsAppNumber(instanceName: string, numbers: string[]): Promise<any> {
    return await this.makeRequest(`/chat/whatsappNumbers/${instanceName}`, 'POST', {
      numbers
    });
  }

  // Enviar mensagem de texto
  async sendTextMessage(instanceName: string, number: string, message: string): Promise<any> {
    return await this.makeRequest(`/message/sendText/${instanceName}`, 'POST', {
      number,
      text: message
    });
  }

  // Enviar mensagem com mídia
  async sendMediaMessage(instanceName: string, number: string, mediaUrl: string, caption?: string): Promise<any> {
    return await this.makeRequest(`/message/sendMedia/${instanceName}`, 'POST', {
      number,
      mediatype: 'image',
      media: mediaUrl,
      caption
    });
  }
}