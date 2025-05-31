import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Settings, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EvolutionInstance } from "@shared/schema";
import EvolutionInstanceForm from "@/components/evolution-instance-form";

export default function Evolution() {
  const { toast } = useToast();
  const [showInstanceForm, setShowInstanceForm] = useState(false);
  const [editingInstance, setEditingInstance] = useState<EvolutionInstance | undefined>();

  const { data: instances = [], isLoading } = useQuery<EvolutionInstance[]>({
    queryKey: ["/api/evolution-instances"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/evolution-instances/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
      toast({
        title: "Sucesso",
        description: "Instância Evolution API removida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover instância: " + error.message,
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/evolution-instances/${id}/set-default`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
      toast({
        title: "Sucesso",
        description: "Instância padrão definida com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao definir instância padrão: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (instance: EvolutionInstance) => {
    setEditingInstance(instance);
    setShowInstanceForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta instância?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativa", variant: "default" as const, icon: CheckCircle },
      inactive: { label: "Inativa", variant: "secondary" as const, icon: XCircle },
      error: { label: "Erro", variant: "destructive" as const, icon: XCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando instâncias...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evolution API</h1>
          <p className="text-muted-foreground">
            Configure suas instâncias WhatsApp para envio automático de mensagens
          </p>
        </div>
        <Button onClick={() => setShowInstanceForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Nenhuma instância configurada
                </h3>
                <p className="text-muted-foreground">
                  Configure sua primeira instância Evolution API para começar a enviar mensagens WhatsApp
                </p>
              </div>
              <Button onClick={() => setShowInstanceForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Configurar Primeira Instância
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <Card key={instance.id} className="relative">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{instance.name}</CardTitle>
                  {instance.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Padrão
                    </Badge>
                  )}
                </div>
                <CardDescription className="truncate">
                  {instance.instanceName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(instance.status || 'inactive')}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div className="truncate">URL: {instance.baseUrl}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(instance)}
                    className="flex-1"
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  
                  {!instance.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(instance.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Definir Padrão
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(instance.id)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EvolutionInstanceForm
        open={showInstanceForm}
        onClose={() => {
          setShowInstanceForm(false);
          setEditingInstance(undefined);
        }}
        instance={editingInstance}
      />
    </div>
  );
}