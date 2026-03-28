import { Link, useLocation } from "react-router-dom";
import { Calendar, Clock, LayoutGrid, CalendarCheck } from "lucide-react";

const navItems = [
  { label: "Event Types", href: "/", icon: LayoutGrid },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  { label: "Availability", href: "/availability", icon: Clock },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-border bg-sidebar min-h-screen">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Calendar className="h-6 w-6 text-cal-brand" />
        <span className="font-semibold text-lg text-foreground tracking-tight">Cal Clone</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 mt-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
