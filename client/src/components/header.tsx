import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";
import { useState } from "react";
import BillingForm from "./billing-form";

const pageInfo = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral do sistema' },
  '/calendar': { title: 'Agenda', subtitle: 'Agenda de cobranças' },
  '/customers': { title: 'Clientes', subtitle: 'Gerenciar clientes' },
  '/kanban': { title: 'Kanban', subtitle: 'Status das cobranças' },
  '/messages': { title: 'Mensagens', subtitle: 'Templates e envios' },
  '/users': { title: 'Usuários', subtitle: 'Controle de usuários' },
};

export default function Header() {
  const [location] = useLocation();
  const [showBillingForm, setShowBillingForm] = useState(false);
  
  const currentPage = pageInfo[location as keyof typeof pageInfo] || pageInfo['/'];

  return (
    <>
      <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{currentPage.title}</h1>
          <p className="text-sm text-muted-foreground">{currentPage.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

    </>
  );
}
