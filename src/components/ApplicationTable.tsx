import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Trash2, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { JobApplication } from '@/types';
import { format } from 'date-fns';

interface ApplicationTableProps {
  applications: JobApplication[];
  onDelete: (id: string) => void;
}

export function ApplicationTable({ applications, onDelete }: ApplicationTableProps) {
  const navigate = useNavigate();

  const handleView = (id: string) => {
    navigate(`/job/${id}`);
  };

  const handleDownloadPdf = (application: JobApplication) => {
    // Mock PDF download - in real app, this would trigger PDF generation
    console.log('Downloading PDF for:', application.companyName);
    const content = `${application.jobTitle} at ${application.companyName}\n\n${application.tailoredResume || 'No resume generated'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${application.companyName}-resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (applications.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No applications yet</h3>
        <p className="text-muted-foreground mb-4">
          Get started by adding your first job application
        </p>
        <Button onClick={() => navigate('/new')}>Add Application</Button>
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[120px]">Date Added</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead className="w-[100px] text-center">Match Score</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application, index) => (
            <TableRow
              key={application.id}
              className="cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleView(application.id)}
            >
              <TableCell className="text-muted-foreground">
                {format(new Date(application.dateAdded), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="font-medium">{application.companyName}</TableCell>
              <TableCell>{application.jobTitle}</TableCell>
              <TableCell className="text-center">
                <MatchScoreBadge score={application.matchScore} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(application.id); }}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPdf(application); }}>
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(application.id); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
