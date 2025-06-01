import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import MessageTemplateForm from "@/components/message-template-form";
import type { MessageTemplate, MessageHistory, Customer, EvolutionInstance } from "@shared/schema";

type MessageHistoryWithCustomer = MessageHistory & { customer: Customer };

export default function Messages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>();
  const [showSendMessageDialog, setShowSendMessageDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [messageContent, setMessageContent] = useState("");
  const [messageMethod, setMessageMethod] = useState<string>("email");
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [showDispatcherDialog, setShowDispatcherDialog] = useState(false);
  const [dispatcherPhone, setDispatcherPhone] = useState("");
  const [dispatcherMessage, setDispatcherMessage] = useState("");
  const [dispatcherInstance, setDispatcherInstance] = useState<string>("");

  const { data: templates, isLoading: templatesLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const { data: messageHistory, isLoading: historyLoading } = useQuery<MessageHistoryWithCustomer[]>({
    queryKey: ["/api/message-history"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: showSendMessageDialog,
  });

  const { data: instances, refetch: refetchInstances, isLoading: instancesLoading } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/evolution-instances"],
    enabled: true, // Sempre carregar instâncias para o Disparador
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/message-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Template excluído",
        description: "Template removido com sucesso.",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { customerId: number; content: string; method: string; instanceId?: number }) => {
      const response = await apiRequest("/api/send-message", "POST", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-history"] });
      toast({
        title: "Mensagem enviada",
        description: "Mensagem enviada com sucesso.",
      });
      setShowSendMessageDialog(false);
      setMessageContent("");
      setSelectedCustomer("");
      setSelectedInstance("");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar mensagem.",
        variant: "destructive",
      });
    },
  });

  const dispatchMessageMutation = useMutation({
    mutationFn: async (data: { phone: string; content: string; instanceId: number }) => {
      const response = await apiRequest("/api/dispatch-message", "POST", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-history"] });
      toast({
        title: "Mensagem disparada",
        description: "Mensagem enviada com sucesso para o número especificado.",
      });
      setShowDispatcherDialog(false);
      setDispatcherPhone("");
      setDispatcherMessage("");
      setDispatcherInstance("");
    },
    onError: (error) => {
      toast({
        title: "Erro no disparador",
        description: "Falha ao enviar mensagem WhatsApp.",
        variant: "destructive",
      });
    },
  });

  const filteredHistory = messageHistory?.filter((message) =>
    message.customer?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
    message.content?.toLowerCase()?.includes(searchTerm.toLowerCase())
  ) || [];

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleCloseTemplateForm = () => {
    setShowTemplateForm(false);
    setEditingTemplate(undefined);
  };

  const getTriggerTypeLabel = (triggerType: string) => {
    switch (triggerType) {
      case 'manual':
        return 'Manual';
      case 'before_due':
        return 'Antes do vencimento';
      case 'on_due':
        return 'No vencimento';
      case 'after_due':
        return 'Após vencimento';
      default:
        return 'Manual';
    }
  };

  const handleSendMessage = () => {
    if (!selectedCustomer || !messageContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um cliente e digite uma mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (messageMethod === "whatsapp" && !selectedInstance) {
      toast({
        title: "Instância obrigatória",
        description: "Selecione uma instância WhatsApp conectada.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      customerId: Number(selectedCustomer),
      content: messageContent,
      method: messageMethod,
      instanceId: selectedInstance ? Number(selectedInstance) : undefined,
    });
  };

  const handleDispatchMessage = () => {
    if (!dispatcherPhone.trim() || !dispatcherMessage.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Digite o número do WhatsApp e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    if (!dispatcherInstance) {
      toast({
        title: "Instância obrigatória",
        description: "Selecione uma instância WhatsApp conectada.",
        variant: "destructive",
      });
      return;
    }

    dispatchMessageMutation.mutate({
      phone: dispatcherPhone,
      content: dispatcherMessage,
      instanceId: Number(dispatcherInstance),
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Data não disponível';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mensagens</h1>
        <p className="text-muted-foreground">Templates e envios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mensagens Personalizadas Section */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mensagens Personalizadas</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure mensagens personalizadas para diferentes situações como confirmações, lembretes e cancelamentos. Estas mensagens podem ser usadas no envio automático ou manual de mensagens.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowTemplateForm(true)}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mensagem
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando templates...</p>
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          <Badge variant={template.triggerType === 'manual' ? 'default' : 'secondary'} className="text-xs">
                            {template.triggerType === 'manual' ? 'Ativo' : 'Automático'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                        
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTriggerTypeLabel(template.triggerType)}
                          {template.triggerDays !== 0 && (
                            <span className="ml-1">- {template.triggerDays} dias</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum template criado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie templates para automatizar suas mensagens
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Disparador Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Disparador
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Envie mensagens individuais para seus contatos do WhatsApp. Selecione uma instância e configure seu envio.
              </p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Instâncias List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Instâncias
                    </h4>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => refetchInstances()}
                      disabled={instancesLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${instancesLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {instancesLoading ? (
                      <div className="text-center py-4">
                        <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-muted-foreground">Carregando instâncias...</p>
                      </div>
                    ) : instances && instances.length > 0 ? (
                      instances.map((instance) => (
                        <div key={instance.id} className={`flex items-center justify-between p-3 border rounded-lg ${
                          instance.isConnected 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              instance.isConnected ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <p className="font-medium text-sm">{instance.instanceName}</p>
                              <p className="text-xs text-muted-foreground">
                                Status: {instance.isConnected ? 'Conectado' : 'Desconectado'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled={!instance.isConnected}
                            onClick={() => {
                              setDispatcherInstance(instance.id.toString());
                              setShowDispatcherDialog(true);
                            }}
                          >
                            {instance.isConnected ? 'Usar' : 'Offline'}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed rounded-lg">
                        <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma instância WhatsApp encontrada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure uma instância na seção Evolution API
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center mt-0.5">
                      <span className="text-xs text-white font-bold">i</span>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">Informações</h5>
                      <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                        Esta função permite enviar uma única mensagem para um número específico. Você pode selecionar um agendamento para preencher automaticamente as informações do cliente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de Envios - Full Width */}
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Histórico de Envios</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="space-y-3">
                {filteredHistory.map((message) => (
                  <div key={message.message_history.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.customer?.name || 'Número direto'}
                        </span>
                        <Badge variant={message.message_history.method === 'email' ? 'default' : 'secondary'}>
                          {message.message_history.method === 'email' ? 'E-mail' : 'WhatsApp'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(message.message_history.status)}
                          <span className="text-xs capitalize">
                            {message.message_history.status === 'sent' ? 'Enviado' : 'Falhou'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {message.message_history.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(message.message_history.sentAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma mensagem enviada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Histórico aparecerá aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showSendMessageDialog} onOpenChange={setShowSendMessageDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Método</label>
              <Select value={messageMethod} onValueChange={setMessageMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {messageMethod === "whatsapp" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Instância WhatsApp</label>
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar instância conectada" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances?.filter(instance => instance.isConnected).map((instance) => (
                      <SelectItem key={instance.id} value={instance.id.toString()}>
                        {instance.instanceName} - {instance.isConnected ? "Conectado" : "Desconectado"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {instances?.filter(instance => instance.isConnected).length === 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    Nenhuma instância WhatsApp conectada. Configure uma instância na seção Evolution API.
                  </p>
                )}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-2 block">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSendMessageDialog(false)}
                disabled={sendMessageMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {sendMessageMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatcher Dialog */}
      <Dialog open={showDispatcherDialog} onOpenChange={setShowDispatcherDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Disparador WhatsApp</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Envie uma mensagem direta para qualquer número do WhatsApp
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Instância WhatsApp</label>
              <Select value={dispatcherInstance} onValueChange={setDispatcherInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {instances?.filter(instance => instance.isConnected).map((instance) => (
                    <SelectItem key={instance.id} value={instance.id.toString()}>
                      {instance.instanceName} - Conectado
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {instances?.filter(instance => instance.isConnected).length === 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  Nenhuma instância WhatsApp conectada. Configure uma instância na seção Evolution API.
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Número WhatsApp</label>
              <Input
                placeholder="Ex: 11999887766 ou 5511999887766"
                value={dispatcherPhone}
                onChange={(e) => setDispatcherPhone(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={dispatcherMessage}
                onChange={(e) => setDispatcherMessage(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowDispatcherDialog(false)}
                disabled={dispatchMessageMutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleDispatchMessage}
                disabled={dispatchMessageMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {dispatchMessageMutation.isPending ? "Enviando..." : "Disparar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MessageTemplateForm 
        open={showTemplateForm}
        onClose={handleCloseTemplateForm}
        template={editingTemplate}
      />
    </div>
  );
}