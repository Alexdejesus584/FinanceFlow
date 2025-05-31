import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Save
} from "lucide-react";
import { EvolutionInstance, EvolutionSettings } from "@shared/schema";

function Evolution() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewInstanceDialog, setShowNewInstanceDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    globalApiUrl: "https://evolutionapi3.m2vendas.com.br",
    globalApiKey: ""
  });
  const [newInstance, setNewInstance] = useState({
    instanceName: "",
    channel: "baileys",
    token: "",
    phoneNumber: ""
  });

  // Buscar configurações globais
  const { data: settings } = useQuery<EvolutionSettings>({
    queryKey: ["/api/evolution-settings"],
    retry: false,
  });

  // Buscar instâncias
  const { data: instances = [], isLoading: instancesLoading } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/evolution-instances"],
    retry: false,
  });

  // Mutation para salvar configurações globais
  const saveGlobalSettings = useMutation({
    mutationFn: async (data: { globalApiUrl: string; globalApiKey: string }) => {
      if (settings?.id) {
        return await apiRequest(`/api/evolution-settings/${settings.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/evolution-settings", "POST", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "As configurações globais da Evolution API foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar nova instância
  const createInstance = useMutation({
    mutationFn: async (data: typeof newInstance) => {
      return await apiRequest("/api/evolution-instances", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Instância criada",
        description: "Nova instância criada com sucesso.",
      });
      setShowNewInstanceDialog(false);
      setNewInstance({
        instanceName: "",
        channel: "baileys",
        token: "",
        phoneNumber: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar instância",
        description: "Não foi possível criar a instância.",
        variant: "destructive",
      });
    },
  });

  // Mutation para conectar/desconectar instância
  const toggleConnection = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'connect' | 'disconnect' }) => {
      return await apiRequest(`/api/evolution-instances/${id}/${action}`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "Status da instância atualizado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da instância.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar instância
  const deleteInstance = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/evolution-instances/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Instância removida",
        description: "Instância removida com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a instância.",
        variant: "destructive",
      });
    },
  });

  const handleSaveGlobalSettings = () => {
    if (!globalSettings.globalApiUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL base da Evolution API.",
        variant: "destructive",
      });
      return;
    }

    if (!globalSettings.globalApiKey.trim()) {
      toast({
        title: "Chave API obrigatória",
        description: "Por favor, insira a chave global da API.",
        variant: "destructive",
      });
      return;
    }

    saveGlobalSettings.mutate(globalSettings);
  };

  const handleCreateInstance = () => {
    if (!newInstance.instanceName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira o nome da instância.",
        variant: "destructive",
      });
      return;
    }

    if (!newInstance.token.trim()) {
      toast({
        title: "Token obrigatório",
        description: "Por favor, insira o token da instância.",
        variant: "destructive",
      });
      return;
    }

    createInstance.mutate(newInstance);
  };

  const filteredInstances = instances.filter(instance =>
    instance.instanceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Carregar configurações existentes
  if (settings && globalSettings.globalApiUrl === "https://evolutionapi3.m2vendas.com.br" && !globalSettings.globalApiKey) {
    setGlobalSettings({
      globalApiUrl: settings.globalApiUrl || "https://evolutionapi3.m2vendas.com.br",
      globalApiKey: settings.globalApiKey || ""
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evolution API</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure os parâmetros globais para integração com a Evolution API. Estas configurações serão usadas para todas as instâncias do WhatsApp.
          </p>
        </div>
      </div>

      {/* Configurações Globais */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Settings className="w-5 h-5" />
            Configurações da Evolution API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              URL Base da Evolution API
            </Label>
            <Input
              id="baseUrl"
              type="text"
              value={globalSettings.globalApiUrl}
              onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiUrl: e.target.value }))}
              placeholder="https://evolutionapi3.m2vendas.com.br"
              className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Insira a URL completa da sua instância da Evolution API, incluindo o protocolo (http:// ou https://)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Chave Global da API
            </Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={globalSettings.globalApiKey}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiKey: e.target.value }))}
                placeholder="••••••••••••••••••••••••••••••"
                className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Esta é a chave de autenticação global para acessar a Evolution API
            </p>
          </div>

          <Button
            onClick={handleSaveGlobalSettings}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            disabled={saveGlobalSettings.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveGlobalSettings.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Instâncias */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Instâncias WhatsApp</h2>
          <Dialog open={showNewInstanceDialog} onOpenChange={setShowNewInstanceDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Nova Instância WhatsApp</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instanceName" className="text-gray-700 dark:text-gray-300">Nome da Instância</Label>
                  <Input
                    id="instanceName"
                    value={newInstance.instanceName}
                    onChange={(e) => setNewInstance(prev => ({ ...prev, instanceName: e.target.value }))}
                    placeholder="Ex: WhatsApp Vendas"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel" className="text-gray-700 dark:text-gray-300">Canal</Label>
                  <Select value={newInstance.channel} onValueChange={(value) => setNewInstance(prev => ({ ...prev, channel: value }))}>
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baileys">Baileys</SelectItem>
                      <SelectItem value="whatsapp-web">WhatsApp Web</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="token" className="text-gray-700 dark:text-gray-300">Token</Label>
                  <Input
                    id="token"
                    value={newInstance.token}
                    onChange={(e) => setNewInstance(prev => ({ ...prev, token: e.target.value }))}
                    placeholder="Token de autenticação"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-gray-700 dark:text-gray-300">Número (Opcional)</Label>
                  <Input
                    id="phoneNumber"
                    value={newInstance.phoneNumber}
                    onChange={(e) => setNewInstance(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="5511999999999"
                    className="bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleCreateInstance}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={createInstance.isPending}
                  >
                    {createInstance.isPending ? "Criando..." : "Criar Instância"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewInstanceDialog(false)}
                    className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar instâncias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>

        {/* Grid de Instâncias */}
        {instancesLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredInstances.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "Nenhuma instância encontrada para sua pesquisa." : "Nenhuma instância criada ainda."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstances.map((instance) => (
              <Card key={instance.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-gray-900 dark:text-white">{instance.instanceName}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{instance.channel}</p>
                    </div>
                    <Badge 
                      variant={instance.isConnected ? "default" : "secondary"}
                      className={instance.isConnected ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}
                    >
                      {instance.isConnected ? "Conectado" : "Desconectado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {instance.phoneNumber && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Número:</strong> {instance.phoneNumber}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={instance.isConnected ? "destructive" : "default"}
                      onClick={() => toggleConnection.mutate({ 
                        id: instance.id, 
                        action: instance.isConnected ? 'disconnect' : 'connect' 
                      })}
                      className="flex-1"
                      disabled={toggleConnection.isPending}
                    >
                      {instance.isConnected ? (
                        <>
                          <PowerOff className="w-4 h-4 mr-1" />
                          Desconectar
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4 mr-1" />
                          Conectar
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteInstance.mutate(instance.id)}
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900"
                      disabled={deleteInstance.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Evolution;