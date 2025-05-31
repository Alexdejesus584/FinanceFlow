import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Billing, Customer } from "@shared/schema";

type BillingWithCustomer = Billing & { customer: Customer };

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  count: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

export default function Kanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draggedItem, setDraggedItem] = useState<BillingWithCustomer | null>(null);

  const { data: billings, isLoading } = useQuery<BillingWithCustomer[]>({
    queryKey: ["/api/billings"],
  });

  const updateBillingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PUT", `/api/billings/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Status atualizado",
        description: "Status da cobrança atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar status.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ customerId, content }: { customerId: number; content: string }) => {
      await apiRequest("POST", "/api/send-message", {
        customerId,
        content,
        method: "email",
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Lembrete enviado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao enviar mensagem.",
        variant: "destructive",
      });
    },
  });

  const getBillingsByStatus = (status: string) => {
    if (!billings) return [];
    
    if (status === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      return billings.filter(billing => 
        billing.status === 'pending' && billing.dueDate < today
      );
    }
    
    return billings.filter(billing => billing.status === status);
  };

  const columns: KanbanColumn[] = [
    {
      id: 'pending',
      title: 'Aguardando',
      status: 'pending',
      count: getBillingsByStatus('pending').length,
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-50 border-yellow-200',
      icon: <Send className="h-4 w-4 text-yellow-600" />
    },
    {
      id: 'paid',
      title: 'Pago',
      status: 'paid',
      count: getBillingsByStatus('paid').length,
      color: 'text-green-800',
      bgColor: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />
    },
    {
      id: 'overdue',
      title: 'Em Atraso',
      status: 'overdue',
      count: getBillingsByStatus('overdue').length,
      color: 'text-red-800',
      bgColor: 'bg-red-50 border-red-200',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />
    },
    {
      id: 'cancelled',
      title: 'Cancelado',
      status: 'cancelled',
      count: getBillingsByStatus('cancelled').length,
      color: 'text-gray-800',
      bgColor: 'bg-gray-50 border-gray-200',
      icon: <X className="h-4 w-4 text-gray-600" />
    }
  ];

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays < 0) return `${Math.abs(diffDays)} dias atraso`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const handleDragStart = (billing: BillingWithCustomer) => {
    setDraggedItem(billing);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    // Don't allow dropping on same status
    if (draggedItem.status === targetStatus) {
      setDraggedItem(null);
      return;
    }

    // Don't allow moving from overdue - it's a computed status
    if (targetStatus === 'overdue') {
      setDraggedItem(null);
      return;
    }

    updateBillingMutation.mutate({
      id: draggedItem.id,
      status: targetStatus
    });
    
    setDraggedItem(null);
  };

  const handleSendReminder = (billing: BillingWithCustomer) => {
    const content = `Olá ${billing.customer.name}! Sua cobrança de ${formatCurrency(billing.amount)} está com vencimento em ${formatDate(billing.dueDate)}. Para mais informações, entre em contato conosco.`;
    
    sendMessageMutation.mutate({
      customerId: billing.customerId,
      content
    });
  };

  const renderBillingCard = (billing: BillingWithCustomer, column: KanbanColumn) => {
    const isOverdue = column.id === 'overdue';
    
    return (
      <Card
        key={billing.id}
        className={`kanban-card cursor-move ${column.bgColor} ${column.color} border`}
        draggable
        onDragStart={() => handleDragStart(billing)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{billing.customer.name}</span>
            <span className="text-xs text-muted-foreground">
              {isOverdue ? formatDate(billing.dueDate) : formatDate(billing.dueDate)}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">{billing.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{formatCurrency(billing.amount)}</span>
            
            {(column.id === 'pending' || column.id === 'overdue') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendReminder(billing);
                }}
                disabled={sendMessageMutation.isPending}
                className="h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
            
            {column.id === 'paid' && (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            
            {column.id === 'cancelled' && (
              <X className="h-5 w-5 text-gray-600" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando cobranças...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnBillings = getBillingsByStatus(column.status);
        
        return (
          <Card key={column.id} className="h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {column.icon}
                  {column.title}
                </CardTitle>
                <Badge variant="outline" className={column.color}>
                  {column.count}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent 
              className="space-y-3 min-h-96"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {columnBillings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma cobrança
                </p>
              ) : (
                columnBillings.map((billing) => 
                  renderBillingCard(billing, column)
                )
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
