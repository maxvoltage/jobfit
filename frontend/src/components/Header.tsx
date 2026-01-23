import { Link, useLocation } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';


export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="page-container !py-0">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-white/50 backdrop-blur-sm border border-border/50 shadow-sm transition-all group-hover:scale-110 group-hover:shadow-md">
              <img src="/logo.png" alt="JobFit Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors tracking-tight">
              JobFit
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-1 border-l pl-4">

              <Button
                asChild
                variant={location.pathname === '/upload' ? 'secondary' : 'outline'}
                size="sm"
                className={cn(
                  'gap-2',
                  location.pathname === '/upload' && 'bg-secondary text-foreground'
                )}
              >
                <Link to="/upload">
                  <Upload className="h-4 w-4" />
                  Upload My Resume
                </Link>
              </Button>
              <Button
                asChild
                variant={location.pathname === '/new' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-2',
                  location.pathname === '/new' && 'bg-secondary text-foreground'
                )}
              >
                <Link to="/new">
                  <Plus className="h-4 w-4" />
                  New Application
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>

  );
}
