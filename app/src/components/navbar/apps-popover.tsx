'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, File, FileArchive, FileText, Inbox, LayoutGrid, type LucideIcon, Search, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  url: string;
  features: string[];
  benefits: string[];
  status?: 'active' | 'beta' | 'new';
}

const modules: Module[] = [
  {
    id: 'sgd',
    title: 'SGD',
    description: 'Gestión integral de documentos institucionales',
    icon: FileText,
    gradient: 'from-blue-500 via-blue-600 to-cyan-500',
    url: 'https://sgd.regionayacucho.gob.pe',
    features: ['Creación y edición de documentos', 'Flujos de aprobación', 'Búsqueda semántica', 'Plantillas dinámicas'],
    benefits: ['Reducción del 90% en uso de papel', 'Control documental total', 'Acceso instantáneo a información'],
    status: 'active',
  },
  {
    id: 'mesa-partes',
    title: 'MPD',
    description: 'Recepción y registro digital 24/7',
    icon: Inbox,
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    url: 'https://mesadepartes.regionayacucho.gob.pe',
    features: ['Validación de usuario', 'Notificaciones en tiempo real'],
    benefits: ['Atención 24/7 sin interrupciones', 'Reducción del 80% en tiempos', 'Trazabilidad completa'],
    status: 'active',
  },
  {
    id: 'verifica',
    title: 'Verifica',
    description: 'Sistema de verificación avanzado',
    icon: CheckCircle,
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    url: 'https://verifica.regionayacucho.gob.pe',
    features: ['Validación instantánea', 'Registro inmutable'],
    benefits: ['Prevención total de falsificaciones', 'Confianza ciudadana del 99%', 'Transparencia absoluta'],
    status: 'active',
  },
  {
    id: 'seguimiento',
    title: 'Seguimiento',
    description: 'Tracking de documentos en tiempo real',
    icon: Search,
    gradient: 'from-pink-500 via-rose-500 to-red-500',
    url: 'https://seguimiento.regionayacucho.gob.pe',
    features: ['Historial inmutable', 'Notificaciones inteligentes'],
    benefits: ['Transparencia total', 'Satisfacción del 98%'],
    status: 'active',
  },
  {
    id: 'file-server',
    title: 'Archivos',
    description: 'Servidor de archivos centralizado',
    icon: File,
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    url: 'https://fileserver.regionayacucho.gob.pe',
    features: ['Almacenamiento seguro', 'Acceso controlado'],
    benefits: ['Gestión centralizada', 'Backup automático'],
    status: 'beta',
  },
  {
    id: 'planillas',
    title: 'Planillas',
    description: 'Gestión de nóminas y planillas',
    icon: FileArchive,
    gradient: 'from-slate-500 via-gray-600 to-zinc-500',
    url: 'https://planillas.regionayacucho.gob.pe',
    features: ['Cálculo automático', 'Reportes detallados'],
    benefits: ['Precisión del 100%', 'Ahorro de tiempo'],
    status: 'new',
  },
];

const statusConfig = {
  active: { label: 'Activo', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  beta: { label: 'Beta', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  new: { label: 'Nuevo', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

export function AppsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 rounded-xl hover:scale-105 transition-all duration-200">
          <LayoutGrid className="w-5 h-5" />
          <span className="sr-only">Aplicaciones</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover shadow-2xl shadow-black/10 backdrop-blur-xl mr-2 border-border/50 w-[480px]" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-border/50 border-b">
            <div>
              <h3 className="font-semibold text-lg">Aplicaciones</h3>
              <p className="text-muted-foreground text-sm">Accede a todos los módulos del sistema</p>
            </div>
            <Badge variant="secondary" className="bg-primary/10 border-primary/20 text-primary">
              {modules.length} apps
            </Badge>
          </div>

          {/* Apps Grid */}
          <div className="gap-3 grid grid-cols-2 max-h-[400px] overflow-y-auto">
            {modules.map((module) => {
              const StatusBadge = statusConfig[module.status || 'active'];
              return (
                <Link key={module.id} href={module.url} target="_blank" rel="noopener noreferrer" className="group">
                  <div className="relative bg-linear-to-br from-card to-card/50 hover:shadow-black/5 hover:shadow-lg p-4 border border-border/50 hover:border-border rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300">
                    {/* Gradient Background */}
                    <div
                      className={cn(
                        'absolute inset-0 bg-linear-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300',
                        module.gradient.replace('from-', 'from-').replace('to-', 'to-').replace('via-', 'via-'),
                      )}
                    />

                    {/* Status Badge */}
                    {module.status && <Badge className={cn('top-2 right-2 absolute px-2 py-0.5 text-xs', StatusBadge.className)}>{StatusBadge.label}</Badge>}

                    <div className="relative space-y-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex justify-center items-center bg-linear-to-br shadow-lg rounded-xl w-12 h-12 group-hover:scale-110 transition-transform duration-300',
                          module.gradient,
                        )}
                      >
                        <module.icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold group-hover:text-primary text-base transition-colors">{module.title}</h4>
                          <ExternalLink className="opacity-0 group-hover:opacity-100 w-3 h-3 text-muted-foreground transition-opacity" />
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">{module.description}</p>
                      </div>

                      {/* Features Preview */}
                      <div className="flex flex-wrap gap-1">
                        {module.features.slice(0, 2).map((feature, index) => (
                          <Badge key={index} variant="secondary" className="bg-muted/50 px-2 py-0.5 border-0 text-muted-foreground text-xs">
                            {feature}
                          </Badge>
                        ))}
                        {module.features.length > 2 && (
                          <Badge variant="secondary" className="bg-muted/50 px-2 py-0.5 border-0 text-muted-foreground text-xs">
                            +{module.features.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-3 border-border/50 border-t">
            <div className="flex justify-between items-center text-muted-foreground text-sm">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                <span>Todas las aplicaciones están integradas</span>
              </div>
              <Badge variant="outline" className="text-xs">
                SSO Habilitado
              </Badge>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
