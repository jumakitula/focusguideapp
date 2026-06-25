import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Calendar, History, Settings, Smartphone, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { email, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/sessions", label: "Sessions", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/android", label: "Android Setup", icon: Smartphone },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar variant="inset">
          <SidebarHeader className="py-6 px-4">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="font-mono font-bold tracking-tight text-xl">FOCUSGUARD</h1>
            </div>
            <div className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">Mission Control</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={location === item.href} tooltip={item.label}>
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border mt-auto">
            {email && (
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-muted-foreground truncate mr-2" title={email}>{email}</div>
                <button onClick={logout} className="p-2 hover:bg-sidebar-accent rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Logout">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto w-full h-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
