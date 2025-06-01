import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Calendar, Search, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  triggerType: string;
  triggerDays: number | null;
  isActive: boolean | null;
}

interface EvolutionInstance {
  id: number;
  instanceName: string;
  isConnected: boolean;
}

export default function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // States
  const [activeTab, setActiveTab] = useState<'dispatcher' | 'schedules'>('dispatcher');
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [dispatcherPhone, setDispatcherPhone] = useState("");
  const [dispatcherMessage, setDispatcherMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [scheduleMessage, setScheduleMessage] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [selectedBillings, setSelectedBillings] = useState<number[]>([]);

  // Queries
  const { data: templates } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const { data: instances, refetch: refetchInstances } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/evolution-instances"],
  });

  const { data: billings } = useQuery({
    queryKey: ["/api/billings"],
  });

  // Mutations
  const dispatchMessageMutation = useMutation({
    mutationFn: async (data: { phone: string; content: string; instanceId: number }) => {
      return await apiRequest("POST", "/api/dispatch-message", data);
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Mensagem enviada com sucesso via WhatsApp.",
      });
      setDispatcherPhone("");
      setDispatcherMessage("");
    },
    onError: () => {
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const sendBillingNotificationsMutation = useMutation({
    mutationFn: async (data: { billingIds: number[]; instanceId: number }) => {
      return await apiRequest("POST", "/api/send-billing-notifications", data);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Cobranças enviadas",
        description: `${data.summary?.sent || 0} mensagens enviadas com sucesso.`,
      });
      setShowBillingDialog(false);
      setSelectedBillings([]);
    },
    onError: () => {
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar as cobranças.",
        variant: "destructive",
      });
    },
  });

  const activeBillings = Array.isArray(billings) ? billings : [];

  const handleSendMessage = () => {
    if (!selectedInstance) {
      toast({
        title: "Selecione uma instância",
        description: "Escolha uma instância WhatsApp conectada.",
        variant: "destructive",
      });
      return;
    }

    if (!dispatcherPhone.trim() || !dispatcherMessage.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o número do destinatário e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    dispatchMessageMutation.mutate({
      phone: dispatcherPhone,
      content: dispatcherMessage,
      instanceId: parseInt(selectedInstance)
    });
  };

  const addVariable = (variable: string) => {
    setDispatcherMessage(prev => prev + `{${variable.toLowerCase()}}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Mensagens</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie mensagens individuais para seus contatos do WhatsApp. Selecione uma instância e configure seu envio.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-card rounded-lg shadow-sm border">
        <div className="grid lg:grid-cols-4 gap-6 p-6">
          {/* Instâncias */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Instâncias</h3>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar instância..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              {instances && instances.length > 0 ? (
                instances.map((instance) => (
                  <div 
                    key={instance.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedInstance === instance.id.toString()
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedInstance(instance.id.toString())}
                  >
                    <div className="font-medium">{instance.instanceName}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: <span className={instance.isConnected ? "text-green-600" : "text-red-600"}>
                        {instance.isConnected ? "Conectado" : "Desconectado"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Nenhuma instância encontrada
                </div>
              )}
            </div>
          </div>

          {/* Tabs and Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button 
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dispatcher' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('dispatcher')}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Disparador</span>
              </button>
              <button 
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'schedules' 
                    ? 'bg-white shadow-sm text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('schedules')}
              >
                <Calendar className="h-4 w-4" />
                <span>Agendamentos</span>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {activeBillings.length}
                </span>
              </button>
            </div>

            {/* Dispatcher Tab */}
            {activeTab === 'dispatcher' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Selecionar Agendamento (opcional)</label>
                  <select className="w-full p-2 border rounded-lg text-gray-500">
                    <option>Selecione um agendamento</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Número do Destinatário</label>
                  <input
                    type="text"
                    placeholder="Ex: 5511999999999"
                    value={dispatcherPhone}
                    onChange={(e) => setDispatcherPhone(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Digite o número com código do país, sem espaços ou caracteres especiais.</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Mensagem</label>
                  <select className="w-full p-2 border rounded-lg">
                    <option>Texto</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Mensagem Personalizada</label>
                  <select 
                    className="w-full p-2 border rounded-lg"
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      const template = templates?.find(t => t.id.toString() === e.target.value);
                      if (template) {
                        setDispatcherMessage(template.content);
                      }
                    }}
                  >
                    <option value="">Selecione uma mensagem personalizada</option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id.toString()}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Mensagem de Texto</label>
                  <textarea
                    placeholder="Digite sua mensagem aqui..."
                    value={dispatcherMessage}
                    onChange={(e) => setDispatcherMessage(e.target.value)}
                    rows={4}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Variáveis Disponíveis (clique para adicionar)</p>
                  <div className="flex flex-wrap gap-2">
                    {['Nome', 'Telefone', 'Data', 'Empresa', 'Saudação', 'Serviço', 'Valor', 'Atendente', 'Horário', 'Observações'].map((variable) => (
                      <button
                        key={variable}
                        onClick={() => addVariable(variable)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded"
                      checked={scheduleMessage}
                      onChange={(e) => setScheduleMessage(e.target.checked)}
                    />
                    <span className="text-sm">Agendar Envio</span>
                  </label>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setDispatcherPhone("");
                      setDispatcherMessage("");
                      setSelectedTemplate("");
                    }}
                  >
                    Limpar
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={handleSendMessage}
                    disabled={dispatchMessageMutation.isPending}
                  >
                    {dispatchMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </div>
              </div>
            )}

            {/* Schedules Tab */}
            {activeTab === 'schedules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Mensagens Agendadas</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBillingDialog(true)}
                  >
                    Processar Cobranças
                  </Button>
                </div>
                
                {activeBillings && activeBillings.length > 0 ? (
                  <div className="space-y-3">
                    {activeBillings.map((item: any) => {
                      const billing = item.billings || item;
                      const customer = item.customer || item.customers;
                      
                      return (
                        <div key={billing.id} className="p-4 border rounded-lg bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                                  Enviada
                                </Badge>
                                <span className="text-sm font-medium">Texto</span>
                                <span className="text-xs text-muted-foreground">
                                  Agendada: {billing.dueDate ? new Date(billing.dueDate).toLocaleDateString('pt-BR') : 'Data não definida'}, 19:28
                                </span>
                              </div>
                              <p className="font-medium text-sm mb-1">
                                Para: {customer?.phone || customer?.whatsapp || '5575988259889'}
                              </p>
                              <p className="text-sm text-muted-foreground mb-2">
                                <span className="font-medium">{customer?.name || 'Cliente'}</span> 😊 Só passando para lembrar que o vencimento da sua assinatura de {billing.description || 'TV Online'} está próxim...
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              🗑️
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem agendada</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Processar Cobranças</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Selecione as cobranças para enviar:</label>
              
              {activeBillings && activeBillings.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activeBillings.map((item: any) => {
                    const billing = item.billings || item;
                    const customer = item.customer || item.customers;
                    
                    return (
                      <div key={billing.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedBillings.includes(billing.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBillings([...selectedBillings, billing.id]);
                            } else {
                              setSelectedBillings(selectedBillings.filter(id => id !== billing.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{customer?.name || 'Cliente não identificado'}</span>
                            <Badge variant="outline">
                              {billing.status === 'paid' ? 'Pago' : 'Pendente'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            R$ {typeof billing.amount === 'number' ? billing.amount.toFixed(2) : '0,00'} - 
                            Vence: {billing.dueDate ? new Date(billing.dueDate).toLocaleDateString('pt-BR') : 'Data não definida'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {billing.description || 'Sem descrição'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma cobrança encontrada</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedBillings.length} cobrança(s) selecionada(s)
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBillingDialog(false);
                    setSelectedBillings([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    sendBillingNotificationsMutation.mutate({
                      instanceId: parseInt(selectedInstance),
                      billingIds: selectedBillings
                    });
                  }}
                  disabled={sendBillingNotificationsMutation.isPending || selectedBillings.length === 0 || !selectedInstance}
                >
                  {sendBillingNotificationsMutation.isPending ? "Enviando..." : `Enviar ${selectedBillings.length} Cobrança(s)`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}