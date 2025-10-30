import React from 'react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarGroupLabel
} from '@/components/ui/sidebar';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Building2,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  {
    label: 'Overview',
    value: 'overview',
    icon: LayoutDashboard
  },
  {
    label: 'Deals',
    value: 'deals',
    icon: TrendingUp
  },
  {
    label: 'Performance',
    value: 'performance',
    icon: BarChart3
  },
  {
    label: 'Lead Management',
    value: 'leads',
    icon: Users
  },
  {
    label: 'CRM',
    value: 'crm',
    icon: Building2
  },
  {
    label: 'Settings',
    value: 'settings',
    icon: Settings
  },
];

export default function DashboardSidebar({
  active,
  onNavigate,
  className
}: {
  active: string;
  onNavigate: (val: string) => void;
  className?: string;
}) {
  return (
    <SidebarProvider>
      <Sidebar className={cn('min-h-screen w-60 border-r bg-gradient-to-b from-slate-50 via-white to-blue-50 shadow-lg', className)}>
        <SidebarContent>
          <SidebarHeader className="mb-2">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-wide select-none">SalesQualify</span>
          </SidebarHeader>
          <SidebarGroupLabel className="uppercase tracking-widest text-xs text-muted-foreground mb-2">Dashboard</SidebarGroupLabel>
          <SidebarMenu>
            {MENU_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={active === item.value}
                    onClick={() => onNavigate(item.value)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-base transition-colors duration-150 hover:bg-blue-50 focus:bg-blue-100"
                  >
                    <Icon className="h-5 w-5 text-blue-600" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
