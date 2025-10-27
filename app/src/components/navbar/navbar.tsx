import { Fullscreen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '../theme/theme-toggle';
import { UserPopover } from './user-popover';
import { AppsPopover } from './apps-popover';

function Navbar() {
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error al intentar poner en fullscreen:', err);
      });
    else
      document.exitFullscreen().catch((err) => {
        console.error('Error al intentar salir de fullscreen:', err);
      });
  };

  return (
    <header className="top-0 z-10 sticky flex items-center gap-4 bg-card/70 backdrop-blur-sm p-6 border-b rounded-t-lg h-16">
      <SidebarTrigger className="hover:cursor-pointer" />

      <div className="flex items-center gap-4 ml-auto text-muted-foreground">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="hover:cursor-pointer" onClick={handleToggleFullscreen}>
          <Fullscreen className="w-5 h-5" />
          <span className="sr-only">Fullscreen</span>
        </Button>
        <AppsPopover />
        <UserPopover />
      </div>
    </header>
  );
}

export default Navbar;
