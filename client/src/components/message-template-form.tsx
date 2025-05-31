import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertMessageTemplateSchema } from "@shared/schema";
import type { MessageTemplate } from "@shared/schema";

const formSchema = insertMessageTemplateSchema.extend({
  triggerDays: z.number().min(0, "Dias deve ser maior ou igual a 0").max(30, "Máximo 30 dias"),
});

type FormData = z.infer<typeof formSchema>;

interface MessageTemplateFormProps {
  open: boolean;
  onClose: () => void;
  template?: MessageTemplate;
}

export default function MessageTemplateForm({ open, onClose, template }: MessageTemplateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name || "",
      content: template?.content || "",
      triggerType: template?.triggerType || "manual",
      triggerDays: template?.triggerDays || 0,
      isActive: template?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const url = template ? `/api/message-templates/${template.id}` : "/api/message-templates";
      const method = template ? "PUT" : "POST";
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: template ? "Template atualizado" : "Template criado",
        description: template 
          ? "Template de mensagem atualizado com sucesso!" 
          : "Novo template de mensagem criado.",
      });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar template.",
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

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      form.reset();
    }
  };

  const triggerType = form.watch("triggerType");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Novo Template"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Template *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Lembrete de Pagamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo da Mensagem *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Olá {nome}! Sua cobrança de R$ {valor} vence em {data}..."
                      className="resize-none"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use variáveis: {"{nome}"}, {"{valor}"}, {"{data}"}, {"{chave_pix}"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Disparo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="before_due">Antes do Vencimento</SelectItem>
                        <SelectItem value="after_due">Após Vencimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {triggerType !== "manual" && (
                <FormField
                  control={form.control}
                  name="triggerDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias {triggerType === "before_due" ? "Antes" : "Após"}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="30"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Quantos dias {triggerType === "before_due" ? "antes" : "após"} o vencimento
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Template Ativo
                    </FormLabel>
                    <FormDescription>
                      Templates ativos serão executados automaticamente
                    </FormDescription>
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
            
            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting 
                  ? "Salvando..." 
                  : template 
                    ? "Atualizar Template" 
                    : "Salvar Template"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
