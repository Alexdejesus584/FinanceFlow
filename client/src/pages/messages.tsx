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
  MessageSquare
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
import type { MessageTemplate, MessageHistory, Customer } from "@shared/schema";

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

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/message-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Template excluído",
        description: "Template de mensagem removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir template.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { customerId: number; content: string; method: string }) => {
      await apiRequest("POST", "/api/send-message", data);
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
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar mensagem.",
        variant: "destructive",
      });
    },
  });

  const filteredHistory = messageHistory?.filter((message) =>
    message.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.content.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSendMessage = () => {
    if (!selectedCustomer || !messageContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um cliente e digite uma mensagem.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      customerId: Number(selectedCustomer),
      content: messageContent,
      method: messageMethod,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: "default",
      failed: "destructive",
      pending: "outline",
    } as const;

    const labels = {
      sent: "Enviado",
      failed: "Falha",
      pending: "Pendente",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getTriggerTypeLabel = (triggerType: string) => {
    const labels = {
      before_due: "Antes do vencimento",
      after_due: "Após vencimento",
      manual: "Manual",
    } as const;

    return labels[triggerType as keyof typeof labels] || triggerType;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Agora";
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Templates de Mensagem</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => setShowSendMessageDialog(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                  <Button 
                    onClick={() => setShowTemplateForm(true)}
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                  </Button>
                </div>
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
                    <div key={template.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-foreground">{template.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-3 text-sm text-foreground mb-3">
                        {template.content}
                      </div>
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {getTriggerTypeLabel(template.triggerType)}
                        {template.triggerDays !== 0 && (
                          <span className="ml-1">- {template.triggerDays} dias</span>
                        )}
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

        {/* Message History Section */}
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
                    className="pl-8 w-40"
                    size="sm"
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
                <div className="space-y-4">
                  {filteredHistory.slice(0, 10).map((message) => (
                    <div key={message.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(message.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {message.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.content.length > 50 
                            ? `${message.content.substring(0, 50)}...` 
                            : message.content
                          }
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          {getStatusBadge(message.status)}
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(message.createdAt!)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma mensagem enviada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm ? "Nenhum resultado encontrado" : "Histórico aparecerá aqui"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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

      <MessageTemplateForm 
        open={showTemplateForm}
        onClose={handleCloseTemplateForm}
        template={editingTemplate}
      />
    </div>
  );
}
