import { useState, useEffect } from 'react';
import { Plus, Briefcase, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ApplicationTable } from '@/components/ApplicationTable';
import { getApplications, deleteApplication } from '@/lib/api';
import { JobApplication } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load applications',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
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

  const stats = [
    {
      label: 'Total Applications',
      value: applications.length,
      icon: Briefcase,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'High Match (80%+)',
      value: applications.filter(a => a.matchScore >= 80).length,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Pending Analysis',
      value: applications.filter(a => a.status === 'pending').length,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Track and manage your job applications</p>
        </div>
        <Button asChild>
          <Link to="/new">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="card-elevated p-5 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Applications Table */}
      <div>
        <h2 className="section-title">Recent Applications</h2>
        {isLoading ? (
          <div className="card-elevated p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </div>
        ) : (
          <ApplicationTable applications={applications} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
