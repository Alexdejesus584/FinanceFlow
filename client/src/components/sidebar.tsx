import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Columns, 
  MessageSquare, 
  UserCog,
  CalendarDays,
  LogOut,
  Plus,
  CreditCard,
  Bot
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import BillingForm from "./billing-form";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Adicionar Cobranças', action: 'new-billing', icon: Plus },
  { name: 'Agenda', href: '/calendar', icon: Calendar },
  { name: 'Clientes', href: '/customers', icon: Users },
  { name: 'Kanban', href: '/kanban', icon: Columns },
  { name: 'Mensagens', href: '/messages', icon: MessageSquare },
  { name: 'Evolution API', href: '/evolution', icon: Bot },
  { name: 'Usuários', href: '/users', icon: UserCog },
];



export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showBillingForm, setShowBillingForm] = useState(false);

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <>
      <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-40">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-border">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-foreground">BillingSaaS</span>
        </div>



        {/* Navigation */}
        <nav className="mt-8 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            
            if (item.action === 'new-billing') {
              return (
                <div
                  key={item.name}
                  onClick={() => setShowBillingForm(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              );
            }
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    isActive 
                      ? "text-primary bg-primary/10 border-r-2 border-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>

        {/* User Section */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center px-3 py-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-primary">
                {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {(user as any)?.firstName || (user as any)?.email || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground">
                {(user as any)?.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>
    </div>

    <BillingForm 
      open={showBillingForm} 
      onClose={() => setShowBillingForm(false)} 
    />
  </>
  );
}
