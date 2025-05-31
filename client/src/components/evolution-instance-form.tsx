import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertEvolutionInstanceSchema, type EvolutionInstance } from "@shared/schema";

const formSchema = insertEvolutionInstanceSchema.extend({
  isDefault: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EvolutionInstanceFormProps {
  open: boolean;
  onClose: () => void;
  instance?: EvolutionInstance;
}

export default function EvolutionInstanceForm({ open, onClose, instance }: EvolutionInstanceFormProps) {
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: instance?.name || "",
      baseUrl: instance?.baseUrl || "",
      apiKey: instance?.apiKey || "",
      instanceName: instance?.instanceName || "",
      isDefault: instance?.isDefault || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (instance) {
        await apiRequest(`/api/evolution-instances/${instance.id}`, "PATCH", data);
      } else {
        await apiRequest("/api/evolution-instances", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolution-instances"] });
      toast({
        title: "Sucesso",
        description: instance ? "Instância atualizada com sucesso" : "Instância criada com sucesso",
      });
      onClose();
      form.reset();
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
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {instance ? "Editar Instância" : "Nova Instância Evolution API"}
          </DialogTitle>
          <DialogDescription>
            Configure os dados de conexão com sua instância Evolution API
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Instância</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: WhatsApp Principal"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Nome para identificar esta instância
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Base</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://api.evolution.com.br"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL base da sua instância Evolution API
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave API</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Sua chave de API"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Chave de autenticação da Evolution API
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instanceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Instância WhatsApp</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="minha-instancia"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Nome único da instância WhatsApp na Evolution API
                  </FormDescription>
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
                    <FormLabel className="text-base">
                      Instância Padrão
                    </FormLabel>
                    <FormDescription>
                      Usar esta instância como padrão para envio de mensagens
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

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}