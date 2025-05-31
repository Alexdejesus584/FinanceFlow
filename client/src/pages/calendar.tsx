import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import BillingForm from "@/components/billing-form";
import type { CalendarEvent, Billing, Customer } from "@shared/schema";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: (CalendarEvent & { billing?: Billing & { customer: Customer } })[];
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Get first and last day of the month for API query
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const { data: events, isLoading } = useQuery<(CalendarEvent & { billing?: Billing & { customer: Customer } })[]>({
    queryKey: ["/api/calendar-events", firstDay.toISOString(), lastDay.toISOString()],
  });

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    // Add days of current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayEvents = events?.filter(event => {
        const eventDate = new Date(event.startDate);
        return (
          eventDate.getDate() === day &&
          eventDate.getMonth() === month &&
          eventDate.getFullYear() === year
        );
      }) || [];

      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        events: dayEvents,
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: [],
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventBadgeColor = (event: CalendarEvent & { billing?: Billing & { customer: Customer } }) => {
    if (!event.billing) return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
    
    switch (event.billing.status) {
      case 'paid':
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
      case 'pending':
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
      case 'overdue':
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
      case 'cancelled':
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400";
    }
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="capitalize">{monthName}</CardTitle>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Em atraso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => setShowBillingForm(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando eventos...</p>
            </div>
          ) : (
            <div className="calendar-grid">
              {/* Header with week days */}
              {weekDays.map((day) => (
                <div key={day} className="calendar-header">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`calendar-cell ${
                    !day.isCurrentMonth ? 'other-month' : ''
                  } ${day.isToday ? 'today' : ''}`}
                >
                  <div className={`text-sm ${day.isToday ? 'calendar-day-number' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {day.events
                      .filter(event => 
                        filterStatus === 'all' || 
                        !event.billing || 
                        event.billing.status === filterStatus
                      )
                      .slice(0, 3)
                      .map((event) => (
                        <div
                          key={event.id}
                          className={`calendar-event ${getEventBadgeColor(event)}`}
                          title={`${event.title} - ${event.billing?.customer.name || ''}`}
                        >
                          {event.billing ? (
                            <>
                              {event.billing.customer.name} - R$ {event.billing.amount}
                            </>
                          ) : (
                            event.title
                          )}
                        </div>
                      ))}
                    
                    {day.events.length > 3 && (
                      <div className="text-xs text-muted-foreground px-2">
                        +{day.events.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BillingForm 
        open={showBillingForm}
        onClose={() => setShowBillingForm(false)}
      />
    </div>
  );
}
