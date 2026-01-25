import { useNavigate } from 'react-router-dom';
import { Eye, Download, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
import { downloadJobPdf } from '@/lib/api';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { JobApplication } from '@/types';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface ApplicationTableProps {
  applications: JobApplication[];
  onDelete: (id: string) => void;
}

export function ApplicationTable({ applications, onDelete }: ApplicationTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleView = (id: string) => {
    navigate(`/job/${id}`);
  };

  const handleDownloadPdf = async (e: React.MouseEvent, application: JobApplication) => {
    e.stopPropagation();
    try {
      await downloadJobPdf(application.id, 'resume');
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Eye className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No applications found</h3>
        <p className="text-muted-foreground mb-4">
          Try adjusting your filter or add a new application
        </p>
        <Button onClick={() => navigate('/new')}>Add Application</Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/50">
              <TableHead className="w-[120px]">Date Added</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead className="w-[100px] text-center">Match Score</TableHead>
              <TableHead className="w-[80px] text-center">Applied</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow
                key={application.id}
                className="cursor-pointer"
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
                <TableCell className="text-center">
                  {application.applied ? (
                    <Check className="h-4 w-4 text-success mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground mx-auto" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isMobile ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleDownloadPdf(e, application)}>
                          <Download className="mr-2 h-4 w-4" />
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
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleDownloadPdf(e, application)}
                            aria-label="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download PDF</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); onDelete(application.id); }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
