import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { getApplication, regenerateContent, updateApplication } from '@/lib/api';
import { JobApplication } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<JobApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');

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
    try {
      const result = await regenerateContent(id);
      setApplication(prev => prev ? {
        ...prev,
        tailoredResume: result.resume,
        coverLetter: result.coverLetter,
      } : null);
      toast({
        title: 'Regenerated',
        description: 'Content has been regenerated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate content',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!application) return;
    
    const content = activeTab === 'resume' 
      ? application.tailoredResume 
      : application.coverLetter;
    
    const blob = new Blob([content || 'No content'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${application.companyName}-${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: `${activeTab === 'resume' ? 'Resume' : 'Cover Letter'} downloaded`,
    });
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
                <span className="text-border">•</span>
                <MatchScoreBadge score={application.matchScore} />
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
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
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
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
            <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">
              {application.jobDescription}
            </pre>
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
  // Simple markdown-like rendering
  const lines = content.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index}>{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index}>{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index}>{line.slice(4)}</h3>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={index} className="font-semibold">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={index}>{line.slice(2)}</li>;
        }
        if (line.startsWith('*') && line.endsWith('*')) {
          return <p key={index} className="italic text-muted-foreground">{line.slice(1, -1)}</p>;
        }
        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }
        return <p key={index}>{line}</p>;
      })}
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
