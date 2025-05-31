import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, AlertTriangle, Clock, UserPlus, CheckCircle, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface DashboardStats {
  totalCustomers: number;
  activeBillings: number;
  monthlyRevenue: number;
  overdueBillings: number;
}

interface RecentActivity {
  id: number;
  type: 'payment' | 'message' | 'customer';
  title: string;
  description: string;
  time: string;
}

interface UpcomingBilling {
  id: number;
  customer: { name: string };
  description: string;
  amount: string;
  dueDate: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentBillings, isLoading: billingsLoading } = useQuery<UpcomingBilling[]>({
    queryKey: ["/api/billings"],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  // Mock recent activities since we don't have a specific endpoint
  const recentActivities: RecentActivity[] = [
    {
      id: 1,
      type: 'payment',
      title: 'Pagamento recebido',
      description: 'Cobrança processada com sucesso',
      time: '2 min'
    },
    {
      id: 2,
      type: 'message',
      title: 'Lembrete enviado',
      description: 'Notificação enviada por email',
      time: '15 min'
    },
    {
      id: 3,
      type: 'customer',
      title: 'Novo cliente',
      description: 'Cliente cadastrado no sistema',
      time: '1h'
    }
  ];

  const upcomingBillings = recentBillings?.slice(0, 3) || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'message':
        return <Send className="h-5 w-5 text-blue-600" />;
      case 'customer':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.totalCustomers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cobranças Ativas</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.activeBillings || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Mensal</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : formatCurrency(stats?.monthlyRevenue || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Atraso</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.overdueBillings || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Upcoming Billings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas Cobranças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {billingsLoading ? (
                <div className="text-sm text-muted-foreground">Carregando...</div>
              ) : upcomingBillings.length > 0 ? (
                upcomingBillings.map((billing) => (
                  <div key={billing.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{billing.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{billing.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(Number(billing.amount))}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(billing.dueDate)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma cobrança próxima</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
