'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, BellDot, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type NotificationItem = {
  id: string | number;
  title: string;
  description?: string;
  href?: string;
  createdAt: string; // ISO or display string
  read: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
};

type NotifyPopoverProps = {
  notifications?: NotificationItem[];
  onMarkRead?: (id: NotificationItem['id']) => void;
  onMarkAllRead?: () => void;
  onDelete?: (id: NotificationItem['id']) => void;
  className?: string;
};

export function NotifyPopover({ notifications: initialNotifications, onMarkRead, onMarkAllRead, onDelete, className }: NotifyPopoverProps) {
  // fallback local state if parent doesn't control it
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(initialNotifications ?? []);

  React.useEffect(() => {
    if (initialNotifications) setNotifications(initialNotifications);
  }, [initialNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const hasUnread = unreadCount > 0;

  const markRead = (id: NotificationItem['id']) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    onMarkRead?.(id);
  };

  const markAllRead = () => {
    if (!notifications.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkAllRead?.();
    toast.success('Todas las notificaciones fueron marcadas como leídas');
  };

  const removeOne = (id: NotificationItem['id']) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    onDelete?.(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative hover:bg-background hover:cursor-pointer', className)}>
          {hasUnread ? <BellDot className="w-5 h-5 text-foreground" /> : <Bell className="w-5 h-5 text-foreground" />}

          {hasUnread && <span className="top-1 right-1 absolute flex justify-center items-center bg-destructive rounded-full w-4 h-4 text-[10px] text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}

          <span className="sr-only">Notificaciones</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="p-0 w-[360px]">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b">
          <div>
            <p className="font-semibold text-sm">Notificaciones</p>
            <p className="text-muted-foreground text-xs">{hasUnread ? `${unreadCount} sin leer` : 'No hay nuevas'}</p>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={markAllRead} disabled={!hasUnread} title="Marcar todas como leídas">
              <CheckCheck className="w-4 h-4" />
            </Button>

            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Ver todas
              </Button>
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-muted-foreground text-sm text-center">No tienes notificaciones aún.</div>
          ) : (
            notifications.map((n) => {
              const content = (
                <div key={n.id} className={cn('flex gap-3 hover:bg-muted/50 p-3 border-b last:border-b-0 transition-colors', !n.read && 'bg-muted/30')}>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p>

                      <div className="flex items-center gap-1">
                        {!n.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markRead(n.id);
                            }}
                            title="Marcar como leída"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeOne(n.id);
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {n.description && <p className="text-muted-foreground text-xs line-clamp-2">{n.description}</p>}

                    <p className="text-[11px] text-muted-foreground">{n.createdAt}</p>
                  </div>
                </div>
              );

              return n.href ? (
                <Link key={n.id} href={n.href} onClick={() => markRead(n.id)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">
                  {content}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
