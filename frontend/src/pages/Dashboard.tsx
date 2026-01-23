import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Briefcase, TrendingUp, TrendingDown, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ApplicationTable } from '@/components/ApplicationTable';
import { getApplications, deleteApplication, getMasterResume } from '@/lib/api';
import { JobApplication, Resume } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'high' | 'medium' | 'applied' | 'tbd';

export default function Dashboard() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [masterResume, setMasterResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    const urlFilter = searchParams.get('filter') as FilterType;
    if (urlFilter) return urlFilter;
    return (localStorage.getItem('dashboardFilter') as FilterType) || 'all';
  });

  const { toast } = useToast();

  const loadMasterResume = useCallback(async () => {
    try {
      const resume = await getMasterResume();
      if (resume) setMasterResume(resume);
    } catch (error: unknown) {
      console.error('Failed to load master resume:', error);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadApplications();
    loadMasterResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (activeFilter === 'all') {
      searchParams.delete('filter');
      localStorage.removeItem('dashboardFilter');
    } else {
      searchParams.set('filter', activeFilter);
      localStorage.setItem('dashboardFilter', activeFilter);
    }
    setSearchParams(searchParams, { replace: true });
  }, [activeFilter, searchParams, setSearchParams]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApplication(id);
      setApplications(prev => prev.filter(app => app.id !== id));
      toast({
        title: 'Deleted',
        description: 'Application removed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    }
  };

  const stats = useMemo(() => [
    {
      key: 'all' as FilterType,
      label: 'Total',
      value: applications.length,
      icon: Briefcase,
      color: 'text-primary',
      bg: 'bg-primary/10',
      activeBg: 'bg-primary',
      activeText: 'text-primary-foreground',
    },
    {
      key: 'high' as FilterType,
      label: 'High Match',
      value: applications.filter(a => a.matchScore >= 80).length,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
      activeBg: 'bg-success',
      activeText: 'text-white',
    },
    {
      key: 'medium' as FilterType,
      label: 'Med Match',
      value: applications.filter(a => a.matchScore >= 50 && a.matchScore < 80).length,
      icon: TrendingDown,
      color: 'text-warning',
      bg: 'bg-warning/10',
      activeBg: 'bg-warning',
      activeText: 'text-white',
    },
    {
      key: 'applied' as FilterType,
      label: 'Applied',
      value: applications.filter(a => a.applied).length,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10',
      activeBg: 'bg-success',
      activeText: 'text-white',
    },
    {
      key: 'tbd' as FilterType,
      label: 'TBD',
      value: applications.filter(a => !a.applied).length,
      icon: Clock,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      activeBg: 'bg-muted-foreground',
      activeText: 'text-white',
    },
  ], [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      switch (activeFilter) {
        case 'high':
          return app.matchScore >= 80;
        case 'medium':
          return app.matchScore >= 50 && app.matchScore < 80;
        case 'applied':
          return app.applied;
        case 'tbd':
          return !app.applied;
        default:
          return true;
      }
    });
  }, [applications, activeFilter]);

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            {masterResume ? `Target Resume: ${masterResume.name}` : 'Track and manage your job applications'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, index) => {
          const isActive = activeFilter === stat.key;
          return (
            <button
              key={stat.label}
              onClick={() => handleFilterChange(stat.key)}
              aria-label={stat.label}
              className={cn(
                "card-elevated p-4 text-left transition-all hover:scale-[1.02]",
                isActive && "ring-2 ring-primary"
              )}
            >

              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  isActive ? `${stat.activeBg} ${stat.activeText}` : stat.bg
                )}>
                  <stat.icon className={cn("h-5 w-5", !isActive && stat.color)} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Applications Table */}
      <div>
        <h2 className="section-title">
          {activeFilter === 'all' ? 'All Applications' : `${stats.find(s => s.key === activeFilter)?.label} Applications`}
        </h2>
        {isLoading ? (
          <div className="card-elevated p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </div>
        ) : (
          <ApplicationTable applications={filteredApplications} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
