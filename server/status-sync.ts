import { storage } from "./storage";
import { EvolutionAPIClient } from "./evolution-api";
import * as cron from "node-cron";

export class StatusSyncService {
  private static instance: StatusSyncService;
  private syncJob: cron.ScheduledTask | null = null;

  public static getInstance(): StatusSyncService {
    if (!StatusSyncService.instance) {
      StatusSyncService.instance = new StatusSyncService();
    }
    return StatusSyncService.instance;
  }

  /**
   * Iniciar sincronização automática de status
   */
  public startSync() {
    // Executar a cada 30 segundos
    this.syncJob = cron.schedule('*/30 * * * * *', async () => {
      await this.syncAllInstanceStatuses();
    });

    console.log('Status sync service started - checking every 30 seconds');
  }

  /**
   * Parar sincronização
   */
  public stopSync() {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
    }
  }

  /**
   * Sincronizar status de todas as instâncias
   */
  private async syncAllInstanceStatuses() {
    try {
      // Buscar todos os usuários que têm configurações da Evolution API
      const userIds = await this.getAllUserIds();
      
      for (const userId of userIds) {
        await this.syncUserInstanceStatuses(userId);
      }
    } catch (error) {
      console.error('Error in status sync:', error);
    }
  }

  /**
   * Sincronizar status das instâncias de um usuário específico
   */
  private async syncUserInstanceStatuses(userId: string) {
    try {
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        return; // Usuário não tem configurações da Evolution API
      }

      const instances = await storage.getEvolutionInstances(userId);
      if (instances.length === 0) {
        return; // Usuário não tem instâncias
      }

      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey,
      });

      // Verificar status de cada instância
      for (const instance of instances) {
        try {
          const evolutionStatus = await evolutionClient.getInstanceStatus(instance.instanceName);
          
          // Determinar o status baseado na resposta da Evolution API
          let isConnected = false;
          let status = 'disconnected';
          
          if (evolutionStatus && evolutionStatus.instance) {
            const state = evolutionStatus.instance.state;
            
            switch (state) {
              case 'open':
                isConnected = true;
                status = 'connected';
                break;
              case 'connecting':
                isConnected = false;
                status = 'connecting';
                break;
              case 'close':
                isConnected = false;
                status = 'disconnected';
                break;
              default:
                isConnected = false;
                status = 'unknown';
            }
          }

          // Atualizar apenas se o status mudou
          if (instance.isConnected !== isConnected || instance.status !== status) {
            await storage.updateEvolutionInstance(instance.id, {
              isConnected,
              status,
            }, userId);
            
            console.log(`Updated instance ${instance.instanceName} status: ${status} (connected: ${isConnected})`);
          }
        } catch (error) {
          // Se não conseguir acessar a instância, marcar como desconectada
          if (instance.isConnected || instance.status !== 'disconnected') {
            await storage.updateEvolutionInstance(instance.id, {
              isConnected: false,
              status: 'disconnected',
            }, userId);
            
            console.log(`Marked instance ${instance.instanceName} as disconnected due to error`);
          }
        }
      }
    } catch (error) {
      console.error(`Error syncing statuses for user ${userId}:`, error);
    }
  }

  /**
   * Obter todos os IDs de usuários que têm configurações da Evolution API
   */
  private async getAllUserIds(): Promise<string[]> {
    // Como não temos uma função específica para isso, vamos implementar uma consulta direta
    try {
      // Por enquanto, vamos usar uma abordagem simplificada
      // Em produção, seria melhor ter uma consulta SQL otimizada
      return []; // Placeholder - seria implementado com consulta no banco
    } catch (error) {
      console.error('Error getting user IDs:', error);
      return [];
    }
  }

  /**
   * Sincronizar status de uma instância específica
   */
  public async syncInstanceStatus(instanceId: number, userId: string): Promise<void> {
    try {
      const settings = await storage.getEvolutionSettings(userId);
      if (!settings) {
        throw new Error('Evolution API settings not found');
      }

      const instance = await storage.getEvolutionInstance(instanceId, userId);
      if (!instance) {
        throw new Error('Instance not found');
      }

      const evolutionClient = new EvolutionAPIClient({
        baseUrl: settings.globalApiUrl,
        globalApiKey: settings.globalApiKey,
      });

      const evolutionStatus = await evolutionClient.getInstanceStatus(instance.instanceName);
      
      let isConnected = false;
      let status = 'disconnected';
      
      if (evolutionStatus && evolutionStatus.instance) {
        const state = evolutionStatus.instance.state;
        
        switch (state) {
          case 'open':
            isConnected = true;
            status = 'connected';
            break;
          case 'connecting':
            isConnected = false;
            status = 'connecting';
            break;
          case 'close':
            isConnected = false;
            status = 'disconnected';
            break;
          default:
            isConnected = false;
            status = 'unknown';
        }
      }

      await storage.updateEvolutionInstance(instanceId, {
        isConnected,
        status,
      }, userId);

      console.log(`Synced instance ${instance.instanceName} status: ${status} (connected: ${isConnected})`);
    } catch (error) {
      console.error(`Error syncing instance ${instanceId} status:`, error);
      throw error;
    }
  }
}

export const statusSyncService = StatusSyncService.getInstance();