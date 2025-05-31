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
  RefreshCw 
} from "lucide-react";
import { EvolutionInstance, EvolutionSettings } from "@shared/schema";

export default function Evolution() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewInstanceDialog, setShowNewInstanceDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newInstance, setNewInstance] = useState({
    instanceName: "",
    channel: "baileys",
    token: "",
    phoneNumber: ""
  });
  const [globalSettings, setGlobalSettings] = useState({
    globalApiUrl: "https://evolutionapi3.m2vendas.com.br",
    globalApiKey: ""
  });

  // Buscar configurações globais
  const { data: settings } = useQuery<EvolutionSettings>({
    queryKey: ["/api/evolution-settings"],
    retry: false,
  });

  // Buscar instâncias
  const { data: instances = [], refetch } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/evolution-instances"],
    enabled: !!settings, // Só busca instâncias se as configurações estão definidas
  });

  // Mutation para salvar configurações globais
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: { globalApiUrl: string; globalApiKey: string }) => {
      const url = settings ? `/api/evolution-settings/${settings.id}` : "/api/evolution-settings";
      const method = settings ? "PUT" : "POST";
      await apiRequest(url, method, data);
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas",
        description: "Configurações globais da Evolution API foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-settings"] });
      setShowSettingsDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações.",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar instância
  const createInstanceMutation = useMutation({
    mutationFn: async (data: typeof newInstance) => {
      await apiRequest("/api/evolution-instances", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Instância criada",
        description: "Nova instância foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
      setShowNewInstanceDialog(false);
      setNewInstance({
        instanceName: "",
        channel: "baileys",
        token: "",
        phoneNumber: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar instância.",
        variant: "destructive",
      });
    },
  });

  // Mutation para conectar/desconectar instância
  const toggleInstanceMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "connect" | "disconnect" }) => {
      await apiRequest(`/api/evolution-instances/${id}/${action}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao alterar status da instância.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir instância
  const deleteInstanceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/evolution-instances/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Instância excluída",
        description: "Instância foi excluída com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir instância.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    if (!globalSettings.globalApiUrl || !globalSettings.globalApiKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a URL da API e a chave global.",
        variant: "destructive",
      });
      return;
    }
    saveSettingsMutation.mutate(globalSettings);
  };

  const handleCreateInstance = () => {
    if (!newInstance.instanceName || !newInstance.token) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome da instância e o token.",
        variant: "destructive",
      });
      return;
    }
    createInstanceMutation.mutate(newInstance);
  };

  const filteredInstances = instances.filter(instance =>
    instance.instanceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Se não há configurações globais, mostrar tela de configuração
  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              Evolution Manager
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl" className="text-gray-300">URL da API</Label>
              <Input
                id="apiUrl"
                value={globalSettings.globalApiUrl}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiUrl: e.target.value }))}
                placeholder="https://evolutionapi3.m2vendas.com.br"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-gray-300">Chave Global da API</Label>
              <Input
                id="apiKey"
                type="password"
                value={globalSettings.globalApiKey}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiKey: e.target.value }))}
                placeholder="Sua chave global da Evolution API"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button 
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Configure a URL e chave global da Evolution API para começar a gerenciar suas instâncias.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <h1 className="text-xl font-semibold">Evolution Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsDialog(true)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Instâncias</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white w-64"
              />
            </div>
          </div>
          <Button
            onClick={() => setShowNewInstanceDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Instância +
          </Button>
        </div>

        {/* Instances Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInstances.map((instance) => (
            <Card key={instance.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white truncate">{instance.instanceName}</h3>
                  <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white">
                        {instance.phoneNumber ? instance.phoneNumber.slice(-4) : "----"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">{instance.phoneNumber || "Não conectado"}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{instance.status === "connected" ? "Conectado" : "Desconectado"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge 
                    variant={instance.isConnected ? "default" : "secondary"}
                    className={instance.isConnected ? "bg-green-600" : "bg-red-600"}
                  >
                    {instance.isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleInstanceMutation.mutate({
                        id: instance.id,
                        action: instance.isConnected ? "disconnect" : "connect"
                      })}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      {instance.isConnected ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteInstanceMutation.mutate(instance.id)}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredInstances.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Nenhuma instância encontrada</p>
            <Button
              onClick={() => setShowNewInstanceDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira instância
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Nova Instância */}
      <Dialog open={showNewInstanceDialog} onOpenChange={setShowNewInstanceDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Nova Instância</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName" className="text-gray-300">Nome *</Label>
              <Input
                id="instanceName"
                value={newInstance.instanceName}
                onChange={(e) => setNewInstance(prev => ({ ...prev, instanceName: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel" className="text-gray-300">Canal</Label>
              <Select
                value={newInstance.channel}
                onValueChange={(value) => setNewInstance(prev => ({ ...prev, channel: value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="baileys">Baileys</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="token" className="text-gray-300">Token *</Label>
              <Input
                id="token"
                value={newInstance.token}
                onChange={(e) => setNewInstance(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Token da instância"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-300">Número</Label>
              <Input
                id="phoneNumber"
                value={newInstance.phoneNumber}
                onChange={(e) => setNewInstance(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="Número do WhatsApp"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreateInstance}
                disabled={createInstanceMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createInstanceMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNewInstanceDialog(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Configurações */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Configurações da API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl" className="text-gray-300">URL da API</Label>
              <Input
                id="apiUrl"
                value={globalSettings.globalApiUrl}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiUrl: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-gray-300">Chave Global da API</Label>
              <Input
                id="apiKey"
                type="password"
                value={globalSettings.globalApiKey}
                onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalApiKey: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {saveSettingsMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSettingsDialog(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}