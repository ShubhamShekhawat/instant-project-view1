import { Link, useLocation } from "react-router-dom";
import { Calendar, Clock, LayoutGrid, CalendarCheck } from "lucide-react";

const navItems = [
  { label: "Events", href: "/", icon: LayoutGrid },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  { label: "Availability", href: "/availability", icon: Clock },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
