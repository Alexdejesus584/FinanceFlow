import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

interface KanbanBoardProps {
  billings: BillingWithCustomer[];
  isLoading?: boolean;
}

export default function KanbanBoard({ billings, isLoading }: KanbanBoardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draggedItem, setDraggedItem] = useState<BillingWithCustomer | null>(null);

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
      bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800',
      icon: <Send className="h-4 w-4 text-yellow-600" />
    },
    {
      id: 'paid',
      title: 'Pago',
      status: 'paid',
      count: getBillingsByStatus('paid').length,
      color: 'text-green-800 dark:text-green-400',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800',
      icon: <CheckCircle className="h-4 w-4 text-green-600" />
    },
    {
      id: 'overdue',
      title: 'Em Atraso',
      status: 'overdue',
      count: getBillingsByStatus('overdue').length,
      color: 'text-red-800 dark:text-red-400',
      bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />
    },
    {
      id: 'cancelled',
      title: 'Cancelado',
      status: 'cancelled',
      count: getBillingsByStatus('cancelled').length,
      color: 'text-gray-800 dark:text-gray-400',
      bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-900/10 dark:border-gray-700',
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
        className={`kanban-card cursor-move ${column.bgColor} ${column.color} border transition-all duration-200 hover:shadow-md`}
        draggable
        onDragStart={() => handleDragStart(billing)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{billing.customer.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(billing.dueDate)}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground mb-2 truncate" title={billing.description}>
            {billing.description}
          </p>
          
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
                className="h-8 w-8 hover:bg-background/50"
                title="Enviar lembrete"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-96">
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-20 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
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
              className="space-y-3 min-h-96 max-h-[600px] overflow-y-auto"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              {columnBillings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  {column.icon}
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhuma cobrança
                  </p>
                </div>
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
