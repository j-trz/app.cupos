import React from 'react';
import { useSidebar } from './SidebarProvider.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function SidebarTrigger({ className, ...props }) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      onClick={() => setCollapsed(!collapsed)}
      className={clsx(
        'absolute -right-3.5 top-12 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 group-data-[collapsible=icon]:inline-flex',
        className
      )}
      {...props}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      <span className="sr-only">Toggle sidebar</span>
    </button>
  );
}
