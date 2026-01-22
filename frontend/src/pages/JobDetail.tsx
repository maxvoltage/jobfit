import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { getApplication, regenerateContent, updateApplication, downloadJobPdf } from '@/lib/api';
import { JobApplication } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<JobApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadApplication(id);
    }
  }, [id]);

  const loadApplication = async (appId: string) => {
    try {
      const data = await getApplication(appId);
      if (data) {
        setApplication(data);
      } else {
        toast({
          title: 'Not Found',
          description: 'Application not found',
          variant: 'destructive',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load application',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppliedChange = async (checked: boolean) => {
    if (!id || !application) return;

    try {
      await updateApplication(id, { applied: checked });
      setApplication(prev => prev ? { ...prev, applied: checked } : null);
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

  const handleRegenerate = async () => {
    if (!id) return;

    setIsRegenerating(true);
    setIsDialogOpen(false);
    try {
      const result = await regenerateContent(id, regenPrompt);
      setApplication(prev => prev ? {
        ...prev,
        tailoredResume: result.resume,
        coverLetter: result.coverLetter,
        matchScore: result.matchScore ?? prev.matchScore,
      } : null);
      toast({
        title: 'Regenerated',
        description: 'Content has been regenerated successfully',
      });
      setRegenPrompt('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate content',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id || !application) return;

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
    return null;
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
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
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
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? "Regenerating..." : "Start Regeneration"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
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
                {application.tailoredResume ? (
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
                {application.coverLetter ? (
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
  // Check if content is HTML
  const isHtml = content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html');

  if (isHtml) {
    return (
      <div className="prose max-w-none dark:prose-invert">
        <iframe
          srcDoc={content}
          className="w-full h-[600px] border-0 bg-white"
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
