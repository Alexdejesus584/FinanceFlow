import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEvolutionInstanceSchema } from "@shared/schema";
import type { EvolutionInstance } from "@shared/schema";

const formSchema = insertEvolutionInstanceSchema;

type FormData = z.infer<typeof formSchema>;

interface EvolutionInstanceFormProps {
  open: boolean;
  onClose: () => void;
  instance?: EvolutionInstance;
}

export default function EvolutionInstanceForm({ open, onClose, instance }: EvolutionInstanceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: instance?.name || "",
      baseUrl: instance?.baseUrl || "https://evolutionapi3.m2vendas.com.br",
      apiKey: instance?.apiKey || "",
      instanceName: instance?.instanceName || "",
      webhookUrl: instance?.webhookUrl || "",
      description: instance?.description || "",
      isDefault: instance?.isDefault || false,
    },
  });

  useEffect(() => {
    if (instance) {
      form.reset({
        name: instance.name,
        baseUrl: instance.baseUrl,
        apiKey: instance.apiKey,
        instanceName: instance.instanceName,
        webhookUrl: instance.webhookUrl || "",
        description: instance.description || "",
        isDefault: instance.isDefault || false,
      });
    } else {
      form.reset({
        name: "",
        baseUrl: "https://evolutionapi3.m2vendas.com.br",
        apiKey: "",
        instanceName: "",
        webhookUrl: "",
        description: "",
        isDefault: false,
      });
    }
  }, [instance, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (instance) {
        return await apiRequest(`/api/evolution-instances/${instance.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/evolution-instances", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
      toast({
        title: "Sucesso",
        description: instance ? "Instância atualizada com sucesso" : "Instância criada com sucesso",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar instância: " + error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {instance ? "Editar Instância Evolution API" : "Nova Instância Evolution API"}
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros da sua instância WhatsApp para envio de mensagens automáticas.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Instância *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: WhatsApp Principal" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="instanceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Instância na Evolution *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: minha_instancia" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Base da Evolution API *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://evolutionapi3.m2vendas.com.br" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave da API *</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Chave de autenticação da Evolution API" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Webhook</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://seu-dominio.com/webhook" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição opcional da instância" 
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Instância Padrão</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Usar esta instância como padrão para envio de mensagens
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : instance ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}