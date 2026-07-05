import React from 'react';
import Button from './Button.jsx';
import { useSidebar } from './SidebarProvider.jsx';
import { PanelLeft } from 'lucide-react';

export default function SidebarTrigger({ className }) {
  const ctx = useSidebar();
  const toggle = ctx ? ctx.toggleSidebar : null;

  return (
    <Button
      variant="ghost"
      onClick={() => toggle && toggle()}
      className={className}
      aria-label="Toggle sidebar"
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
