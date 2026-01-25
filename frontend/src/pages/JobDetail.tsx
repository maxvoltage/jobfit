import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Building2, Loader2, Edit2, Save, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { getApplication, regenerateContent, updateApplication, downloadJobPdf, deleteApplication } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JobApplication } from '@/types';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('resume');
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedResume, setEditedResume] = useState('');
  const [editedCover, setEditedCover] = useState('');

  // Queries
  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id!),
    enabled: !!id,
    retry: false,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<JobApplication>) => updateApplication(id!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        title: 'Deleted',
        description: 'Application removed successfully',
      });
      navigate('/');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateContent(id!, regenPrompt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({
        title: 'Regenerated',
        description: 'Content has been regenerated successfully',
      });
      setRegenPrompt('');
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to regenerate content',
        variant: 'destructive',
      });
    }
  });

  // Helper to extract body content from HTML
  const extractBody = (html: string) => {
    if (!html) return '';
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : html;
  };

  // Helper to re-wrap body content into original HTML structure
  const rewrapBody = (originalHtml: string, newBody: string) => {
    if (!originalHtml.includes('<body')) return newBody;
    return originalHtml.replace(/(<body[^>]*>)([\s\S]*?)(<\/body>)/i, `$1${newBody}$3`);
  };

  const handleAppliedChange = async (checked: boolean) => {
    try {
      await updateMutation.mutateAsync({ applied: checked });
      toast({
        title: checked ? 'Marked as Applied' : 'Marked as Not Applied',
        description: 'Application status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      await downloadJobPdf(id, activeTab as 'resume' | 'cover');
      toast({
        title: 'Downloaded',
        description: `${activeTab === 'resume' ? 'Resume' : 'Cover Letter'} download started`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = () => {
    if (!application) return;
    setEditedResume(extractBody(application.tailoredResume || ''));
    setEditedCover(extractBody(application.coverLetter || ''));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!application) return;
    try {
      const fullResume = rewrapBody(application.tailoredResume || '', editedResume);
      const fullCover = rewrapBody(application.coverLetter || '', editedCover);

      await updateMutation.mutateAsync({
        tailoredResume: fullResume,
        coverLetter: fullCover
      });

      toast({
        title: 'Saved',
        description: 'Changes saved successfully',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="page-container">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Application Not Found</h2>
          <Button onClick={() => navigate('/')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="page-title">{application.jobTitle}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                {application.companyName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <MatchScoreBadge score={application.matchScore} className="mr-2" />
            <div className="flex items-center gap-2">
              <Checkbox
                id="applied"
                checked={application.applied}
                onCheckedChange={handleAppliedChange}
              />
              <Label htmlFor="applied" className="text-sm font-medium cursor-pointer">
                Applied
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={regenerateMutation.isPending}
                      >
                        {regenerateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Regenerate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Regenerate Content</DialogTitle>
                        <DialogDescription>
                          Is there something specific you'd like to change or correct?
                          (e.g., "my name is wrong", "emphasize my Python skills more")
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Textarea
                          placeholder="Enter your instructions here (optional)..."
                          value={regenPrompt}
                          onChange={(e) => setRegenPrompt(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="submit"
                          onClick={() => regenerateMutation.mutate()}
                          disabled={regenerateMutation.isPending}
                        >
                          {regenerateMutation.isPending ? "Regenerating..." : "Start Regeneration"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" onClick={handleStartEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Text
                  </Button>
                  <Button onClick={handleDownloadPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the application for <strong>{application.jobTitle}</strong> at <strong>{application.companyName}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Job Description */}
        <div className="card-elevated p-6">
          <h2 className="section-title">Original Job Description</h2>
          <div className="max-h-[600px] overflow-y-auto pr-2">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{application.jobDescription}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Right Column - Resume & Cover Letter */}
        <div className="card-elevated p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="resume">Tailored Resume</TabsTrigger>
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-0">
              <div className="max-h-[600px] overflow-y-auto pr-2">
                {isEditing ? (
                  <RichTextEditor
                    content={editedResume}
                    onChange={setEditedResume}
                  />
                ) : application.tailoredResume ? (
                  <div className="markdown-preview">
                    <MarkdownPreview content={application.tailoredResume} />
                  </div>
                ) : (
                  <EmptyState message="No tailored resume generated yet" />
                )}
              </div>
            </TabsContent>

            <TabsContent value="cover" className="mt-0">
              <div className="max-h-[600px] overflow-y-auto pr-2">
                {isEditing ? (
                  <RichTextEditor
                    content={editedCover}
                    onChange={setEditedCover}
                  />
                ) : application.coverLetter ? (
                  <div className="markdown-preview">
                    <MarkdownPreview content={application.coverLetter} />
                  </div>
                ) : (
                  <EmptyState message="No cover letter generated yet" />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const { resolvedTheme } = useTheme();
  // Check if content is HTML
  const isHtml = content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html');

  if (isHtml) {
    let finalContent = content;
    if (resolvedTheme === 'dark') {
      const darkStyles = `
        <style>
          :root { color-scheme: dark; }
          body { 
            background-color: #111827 !important; 
            color: #f3f4f6 !important; 
            margin: 0;
            padding: 1rem;
          }
          /* Basic reachability for generic HTML */
          td, th, p, span, li, h1, h2, h3, h4, h5, h6 { color: #f3f4f6 !important; }
          a { color: #60a5fa !important; }
        </style>
      `;
      if (content.includes('<head>')) {
        finalContent = content.replace('<head>', `<head>${darkStyles}`);
      } else {
        finalContent = darkStyles + content;
      }
    }

    return (
      <div className="prose max-w-none dark:prose-invert">
        <iframe
          srcDoc={finalContent}
          className={cn(
            "w-full h-[600px] border-0 rounded-md",
            resolvedTheme === 'dark' ? "bg-[#111827]" : "bg-white"
          )}
          title="Resume Preview"
        />
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none font-sans leading-relaxed">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}


function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[300px] text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
