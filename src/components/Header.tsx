import { Link, useLocation } from 'react-router-dom';
import { Briefcase, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="page-container !py-0">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              JobTracker
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload My Resume
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
          </nav>
        </div>
      </div>
    </header>
  );
}
