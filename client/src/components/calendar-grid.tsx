import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BillingForm from "./billing-form";
import type { Billing, Customer, CalendarEvent } from "@shared/schema";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: (CalendarEvent & { billing?: Billing & { customer: Customer } })[];
}

interface CalendarGridProps {
  onNewBilling?: () => void;
}

export default function CalendarGrid({ onNewBilling }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBillingForm, setShowBillingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: events = [] } = useQuery<(CalendarEvent & { billing?: Billing & { customer: Customer } })[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: billings = [] } = useQuery<(Billing & { customer: Customer })[]>({
    queryKey: ["/api/billings"],
  });

  // Get current month info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Create calendar days
  const calendarDays: CalendarDay[] = [];
  
  // Previous month days
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      events: [],
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === new Date().toDateString();
    
    // Get events for this day (including billings as events)
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });

    // Get billings for this day
    const dayBillings = billings.filter(billing => {
      const billingDate = new Date(billing.dueDate);
      return billingDate.toDateString() === date.toDateString();
    });

    // Convert billings to events format
    const billingEvents = dayBillings.map(billing => ({
      id: billing.id,
      title: `Vencimento: ${billing.customer.name}`,
      startDate: new Date(billing.dueDate),
      endDate: null,
      description: billing.description,
      userId: billing.userId,
      billingId: billing.id,
      isAllDay: true,
      recurrenceRule: null,
      createdAt: billing.createdAt,
      updatedAt: billing.updatedAt,
      billing: billing,
    }));

    calendarDays.push({
      date,
      isCurrentMonth: true,
      isToday,
      events: [...dayEvents, ...billingEvents],
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    calendarDays.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      events: [],
    });
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

  const getEventColor = (event: any) => {
    if (event.billing) {
      switch (event.billing.status) {
        case "pending": return "bg-yellow-500";
        case "paid": return "bg-green-500";
        case "overdue": return "bg-red-500";
        case "cancelled": return "bg-gray-500";
        default: return "bg-blue-500";
      }
    }
    return "bg-blue-500";
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day.date);
    setShowBillingForm(true);
  };

  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg shadow">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {monthNames[month]} de {year}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => setShowBillingForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Cobrança
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <Card 
                key={index} 
                className={`min-h-[120px] cursor-pointer transition-colors ${
                  !day.isCurrentMonth ? "opacity-50" : ""
                } ${
                  day.isToday ? "ring-2 ring-purple-500" : ""
                } hover:bg-gray-50`}
                onClick={() => handleDayClick(day)}
              >
                <CardContent className="p-2">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm font-medium ${
                      day.isToday ? "text-purple-600" : 
                      day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
                    }`}>
                      {day.date.getDate()}
                    </span>
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {day.events.slice(0, 3).map((event, eventIndex) => (
                      <Tooltip key={eventIndex}>
                        <TooltipTrigger asChild>
                          <div className={`text-xs px-2 py-1 rounded text-white truncate ${getEventColor(event)}`}>
                            {event.billing ? 
                              `${event.billing.customer.name}` : 
                              event.title
                            }
                            {event.billing && (
                              <div className="text-xs opacity-75">
                                R$ {event.billing.amount}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="p-2">
                            <p className="font-medium">
                              {event.billing ? event.billing.customer.name : event.title}
                            </p>
                            {event.billing && (
                              <>
                                <p className="text-sm">Valor: R$ {event.billing.amount}</p>
                                <p className="text-sm">Status: {event.billing.status}</p>
                                <p className="text-sm">Descrição: {event.billing.description}</p>
                                {event.billing.customer.phone && (
                                  <p className="text-sm">Telefone: {event.billing.customer.phone}</p>
                                )}
                                {event.billing.customer.email && (
                                  <p className="text-sm">Email: {event.billing.customer.email}</p>
                                )}
                              </>
                            )}
                            {event.description && (
                              <p className="text-sm">{event.description}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {day.events.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{day.events.length - 3} mais
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BillingForm 
        open={showBillingForm} 
        onClose={() => {
          setShowBillingForm(false);
          setSelectedDate(null);
        }}
      />
    </TooltipProvider>
  );
}