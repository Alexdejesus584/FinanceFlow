import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, CreditCard, MessageSquare } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 dark:from-purple-900 dark:to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            BillingSaaS
          </h1>
          <p className="text-xl text-purple-100 mb-8">
            Sistema completo de cobrança recorrente com agenda inteligente
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
          >
            Entrar no Sistema
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 bg-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <CalendarDays className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Agenda Inteligente</h3>
              <p className="text-purple-100 text-sm">
                Visualize e gerencie suas cobranças em um calendário intuitivo
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Gestão de Clientes</h3>
              <p className="text-purple-100 text-sm">
                Cadastre e organize seus clientes com informações completas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <CreditCard className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Cobrança Recorrente</h3>
              <p className="text-purple-100 text-sm">
                Automatize cobranças mensais, semanais ou personalizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/10 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Notificações</h3>
              <p className="text-purple-100 text-sm">
                Envie lembretes automáticos por email e WhatsApp
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-purple-200 text-sm">
            Simplifique sua gestão financeira com nossa plataforma completa
          </p>
        </div>
      </div>
    </div>
  );
}
