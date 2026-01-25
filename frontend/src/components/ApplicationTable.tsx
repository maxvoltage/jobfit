import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
                  <div className="flex items-center justify-end gap-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the application for <strong>{application.jobTitle}</strong> at <strong>{application.companyName}</strong>. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(application.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
