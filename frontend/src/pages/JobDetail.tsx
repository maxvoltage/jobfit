import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Building2, Loader2, Edit2, Save, X, Trash2, FileDown, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { getApplication, regenerateContent, updateApplication, downloadJobPdf, downloadJobDocx, deleteApplication, getResumes } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ResumeSelector } from '@/components/ResumeSelector';
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
  const [isResumeSelectorOpen, setIsResumeSelectorOpen] = useState(false);
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

  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: getResumes,
  });

  const activeResume = resumes.find(r => r.is_selected) || resumes[0];

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
    mutationFn: () => regenerateContent(id!, regenPrompt, activeResume?.id),
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

  const handleDownloadPdf = () => {
    if (!id) return;
    toast({
      title: 'Download Started',
      description: `${activeTab === 'resume' ? 'Resume' : 'Cover Letter'} PDF is being generated.`,
    });
    downloadJobPdf(id, activeTab as 'resume' | 'cover');
  };

  const handleDownloadDocx = () => {
    if (!id) return;
    toast({
      title: 'Download Started',
      description: `${activeTab === 'resume' ? 'Resume' : 'Cover Letter'} Word document is being generated.`,
    });
    downloadJobDocx(id, activeTab as 'resume' | 'cover');
  };

  const handleStartEdit = () => {
    if (!application) return;
    setEditedResume(extractBody(application.resume || ''));
    setEditedCover(extractBody(application.coverLetter || ''));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!application) return;
    try {
      const fullResume = rewrapBody(application.resume || '', editedResume);
      const fullCover = rewrapBody(application.coverLetter || '', editedCover);

      await updateMutation.mutateAsync({
        resume: fullResume,
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
                        variant="secondary"
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                        disabled={regenerateMutation.isPending}
                      >
                        {regenerateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {application.matchScore === null ? "Generate Score & CV" : "Regenerate"}
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
                  <Button
                    variant="secondary"
                    className="bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                    onClick={handleStartEdit}
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit Text
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                    onClick={handleDownloadPdf}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="secondary"
                    className="bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                    onClick={handleDownloadDocx}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Word
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20 transition-all font-semibold"
                      >
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
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="mt-0">
              <div className={cn("pr-2", !isEditing && "max-h-[600px] overflow-y-auto")}>
                {isEditing ? (
                  <RichTextEditor
                    content={editedResume}
                    onChange={setEditedResume}
                  />
                ) : application.resume && application.resume.trim() !== "" ? (
                  <div className="markdown-preview">
                    <MarkdownPreview content={application.resume} />
                  </div>
                ) : !application.resumeId && activeResume ? (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-2 pl-4 text-xs flex items-center justify-between text-primary animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/5 p-2.5 rounded-lg opacity-80">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight">Job description unmatched</p>
                          <p className="opacity-95 text-[11px] mt-0.5">Generate score & CV to match job description</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="h-10 w-px bg-primary/20 mx-1 hidden sm:block" />
                        <Button
                          variant="secondary"
                          className="h-auto py-1 px-3 flex items-center gap-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl transition-all shadow-sm group"
                          onClick={() => setIsResumeSelectorOpen(true)}
                        >
                          <div className="flex flex-col items-start gap-0">
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Selected Resume</span>
                            <span className="text-sm font-bold">{activeResume.name}</span>
                          </div>
                          <div className="bg-primary/20 p-1.5 rounded-lg group-hover:bg-primary/30 transition-colors">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                        </Button>
                      </div>
                    </div>
                    <div className="markdown-preview opacity-60 grayscale-[0.2]">
                      <MarkdownPreview content={activeResume.content} />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    message="No resume linked yet"
                    description="Upload a resume or select one from the sidebar to see it matched here."
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="cover" className="mt-0">
              <div className={cn("pr-2", !isEditing && "max-h-[600px] overflow-y-auto")}>
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
                  <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                    <EmptyState
                      message="No cover letter generated yet."
                      description="Ready to apply? Generate your matching analysis and cover letter in seconds."
                    />
                    <Button
                      onClick={() => regenerateMutation.mutate()}
                      disabled={regenerateMutation.isPending}
                      variant="secondary"
                      className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold py-6 px-8 rounded-xl"
                    >
                      {regenerateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Generate Matching Score & CV
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ResumeSelector
        open={isResumeSelectorOpen}
        onOpenChange={setIsResumeSelectorOpen}
        resumes={resumes}
        selectedResumeId={activeResume?.id.toString() || ''}
        onSelectResume={() => {
          queryClient.invalidateQueries({ queryKey: ['resumes'] });
          toast({
            title: "Resume Swapped",
            description: `Now using ${activeResume?.name} for preview.`,
          });
        }}
      />
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const { resolvedTheme } = useTheme();
  // Check if content is HTML
  const trimmed = content.trim();
  const isHtml = trimmed.startsWith('<!DOCTYPE html>') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<head') ||
    trimmed.startsWith('<body');

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


function EmptyState({ message, description }: { message: string, description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
      <p className="text-lg font-medium text-foreground">{message}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
    </div>
  );
}
