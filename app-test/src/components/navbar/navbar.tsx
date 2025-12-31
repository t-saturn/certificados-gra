import { Fullscreen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '../theme/theme-toggle';
import { UserPopover } from './user-popover';
import { AppsPopover } from './apps-popover';
import { toast } from 'sonner';
import { NotifyPopover, NotificationItem } from './notify-popover';

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: 'Evento “Capacitación Q2 2024” creado',
    description: 'Ya puedes cargar participantes.',
    href: '/main/events/1/participants',
    createdAt: 'Hace 5 min',
    read: false,
  },
  {
    id: 2,
    title: 'Se firmaron 120 certificados',
    description: 'El evento pasó a estado FIRMADO.',
    createdAt: 'Ayer',
    read: true,
  },
];

function Navbar() {
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch(() => {
        // console.error('Error al intentar poner en fullscreen:', err);
        toast.error('Error al intentar poner en fullscreen');
      });
    else
      document.exitFullscreen().catch(() => {
        // console.error('Error al intentar salir de fullscreen:', err);
        toast.error('Error al intentar salir de fullscreen');
      });
  };

  return (
    <header className="top-0 z-10 sticky flex items-center gap-4 bg-card/70 backdrop-blur-sm p-6 border-b rounded-t-lg h-16">
      <SidebarTrigger className="hover:cursor-pointer" />

      <div className="flex items-center gap-4 ml-auto text-muted-foreground">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="hover:bg-background hover:cursor-pointer" onClick={handleToggleFullscreen}>
          <Fullscreen className="w-5 h-5" />
          <span className="sr-only">Fullscreen</span>
        </Button>
        <AppsPopover />

        <NotifyPopover notifications={mockNotifications} />

        <UserPopover />
      </div>
    </header>
  );
}

export default Navbar;
