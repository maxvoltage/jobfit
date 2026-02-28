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
          <Link to="/" className="font-bold text-xl text-foreground hover:text-primary transition-colors tracking-tight">
            JobFit
          </Link>

          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-1 border-l pl-4">

              <Button
                asChild
                variant="secondary"
                size="sm"
                className={cn(
                  'gap-2 border border-primary/20 transition-all font-semibold',
                  location.pathname === '/upload' ? 'bg-primary/20 text-foreground' : 'bg-primary/5 text-muted-foreground'
                )}
              >
                <Link to="/upload">
                  <Upload className="h-4 w-4" />
                  Upload My Resume
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={cn(
                  'gap-2 border border-primary/20 transition-all font-semibold',
                  location.pathname === '/new' ? 'bg-primary/20 text-foreground' : 'bg-primary/5 text-muted-foreground'
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
