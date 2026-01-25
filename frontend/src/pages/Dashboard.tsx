import { useState, useEffect, useMemo } from 'react';
import { Briefcase, TrendingUp, TrendingDown, CheckCircle, Clock, FileText } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { ApplicationTable } from '@/components/ApplicationTable';
import { getApplications, deleteApplication, getSelectedResume, getResumes } from '@/lib/api';
import { FilterType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ResumeSelector } from '@/components/ResumeSelector';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [isResumeSelectorOpen, setIsResumeSelectorOpen] = useState(false);

  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    const urlFilter = searchParams.get('filter') as FilterType;
    if (urlFilter) return urlFilter as FilterType;
    return (localStorage.getItem('dashboardFilter') as FilterType) || 'all';
  });

  // Queries
  const { data: applications = [], isLoading: isAppsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: getApplications,
  });

  const { data: selectedResume } = useQuery({
    queryKey: ['selectedResume'],
    queryFn: getSelectedResume,
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: getResumes,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        title: 'Deleted',
        description: 'Application removed successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    }
  });

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
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Dashboard</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Currently Selected Resume:</span>
            {resumes.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResumeSelectorOpen(true)}
                className="h-8 py-0 px-2 font-normal text-xs"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {selectedResume ? selectedResume.name : 'Select a resume'}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                No resumes found. <Link to="/upload" className="text-primary hover:underline">Upload one first</Link>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => {
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
        {isAppsLoading && applications.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </div>
        ) : (
          <ApplicationTable
            applications={filteredApplications}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>

      <ResumeSelector
        open={isResumeSelectorOpen}
        onOpenChange={setIsResumeSelectorOpen}
        resumes={resumes}
        selectedResumeId={selectedResume?.id?.toString() || ''}
        onSelectResume={() => {
          queryClient.invalidateQueries({ queryKey: ['selectedResume'] });
          queryClient.invalidateQueries({ queryKey: ['resumes'] });
        }}
        onResumeUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['resumes'] });
          queryClient.invalidateQueries({ queryKey: ['selectedResume'] });
        }}
      />
    </div>
  );
}

