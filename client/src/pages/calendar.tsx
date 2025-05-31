import CalendarGrid from "@/components/calendar-grid";

export default function Calendar() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agenda</h1>
        <p className="text-gray-600">Agenda de cobranças</p>
      </div>
      
      <CalendarGrid />
    </div>
  );
}