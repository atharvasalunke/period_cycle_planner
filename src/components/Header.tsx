import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutGrid, Settings, Sparkles } from 'lucide-react';
import { Calendar, LayoutGrid, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  showCyclePhases: boolean;
  onToggleCyclePhases: () => void;
  onOpenSettings?: () => void;
}

export function Header({
  showCyclePhases,
  onToggleCyclePhases,
  onOpenSettings,
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isBrainDumpPage = location.pathname === '/brain-dump';
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                CycleSync
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                Plan with your rhythm
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isBrainDumpPage && (
            <>
              <Button
                variant={showCyclePhases ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onToggleCyclePhases}
                className="gap-1.5 text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cycle View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/brain-dump')}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Brain Dump
              </Button>
            </>
          )}
          {!isBrainDumpPage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onOpenSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant={showCyclePhases ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleCyclePhases}
            className="gap-1.5 text-xs hidden sm:flex"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cycle View
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9 border-2 border-background shadow-sm hover:border-primary/20 transition-all">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                    {user?.name?.substring(0, 2) || <UserIcon className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-xl shadow-card" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer gap-2 py-2.5">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Cycle Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer gap-2 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
