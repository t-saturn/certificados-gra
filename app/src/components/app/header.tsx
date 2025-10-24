import Image from 'next/image';

import { ThemeToggle } from '@/components/theme/theme-toggle';

const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={`container mx-auto w-full px-6 ${className ?? ''}`}>{children}</div>
);

const Logo: React.FC = () => (
  <div className="flex items-center gap-2 sm:gap-3" data-testid="logo">
    <Image src="/img/logo.png" alt="Logo Gobierno Regional de Ayacucho" width={36} height={36} className="rounded-full" priority />
    <div className="hidden sm:block leading-tight">
      <p className="font-bold tracking-tight">
        <span className="font-black text-primary text-lg sm:text-xl">Gobierno Regional</span>
      </p>
      <p className="font-black text-primary text-lg sm:text-xl tracking-tight">de Ayacucho</p>
    </div>
  </div>
);

export const Header: React.FC = () => (
  <header className="top-0 z-50 fixed inset-x-0 bg-background/80 backdrop-blur border-b">
    <Container className="flex justify-between items-center py-2 sm:py-3">
      <Logo />
      <ThemeToggle />
    </Container>
  </header>
);
