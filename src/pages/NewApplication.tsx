import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, FileText, Loader2, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { MatchScoreBadge } from '@/components/MatchScoreBadge';
import { analyzeJobUrl, analyzeJobDescription, saveApplication } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AnalyzeJobResponse } from '@/types';

export default function NewApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('url');
  const [jobUrl, setJobUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzeJobResponse | null>(null);

  const handleAnalyzeUrl = async () => {
    if (!jobUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a job URL',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJobUrl(jobUrl);
      setAnalyzedData(result);
      toast({
        title: 'Analysis Complete',
        description: 'Job description has been analyzed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze job URL',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeManual = async () => {
    if (!manualDescription.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste a job description',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeJobDescription(manualDescription);
      setAnalyzedData(result);
      toast({
        title: 'Analysis Complete',
        description: 'Job description has been analyzed successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze job description',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analyzedData) return;

    setIsSaving(true);
    try {
      const saved = await saveApplication({
        companyName: analyzedData.companyName,
        jobTitle: analyzedData.jobTitle,
        jobDescription: analyzedData.jobDescription,
        matchScore: analyzedData.matchScore,
        tailoredResume: analyzedData.tailoredResume,
        coverLetter: analyzedData.coverLetter,
        jobUrl: activeTab === 'url' ? jobUrl : undefined,
      });
      
      toast({
        title: 'Saved',
        description: 'Application saved successfully',
      });
      navigate(`/job/${saved.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save application',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setAnalyzedData(null);
    setJobUrl('');
    setManualDescription('');
  };

  return (
    <div className="page-container">
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
        <h1 className="page-title">New Application</h1>
        <p className="page-description">Add a new job application to track</p>
      </div>

      <div className="max-w-3xl">
        <div className="card-elevated">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setAnalyzedData(null); }}>
            <TabsList className="w-full grid grid-cols-2 m-4 max-w-md">
              <TabsTrigger value="url" className="gap-2">
                <Link2 className="h-4 w-4" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <FileText className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <div className="p-6 pt-2">
              <TabsContent value="url" className="mt-0">
                {!analyzedData ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="jobUrl" className="input-label">Job URL</Label>
                      <Input
                        id="jobUrl"
                        placeholder="https://careers.example.com/job/12345"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        className="h-11"
                      />
                      <p className="text-sm text-muted-foreground mt-1.5">
                        Paste the job posting URL and we'll extract the details
                      </p>
                    </div>
                    <Button
                      onClick={handleAnalyzeUrl}
                      disabled={isAnalyzing || !jobUrl.trim()}
                      className="w-full h-11"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze'
                      )}
                    </Button>
                  </div>
                ) : (
                  <AnalyzedContent
                    data={analyzedData}
                    onSave={handleSave}
                    onReset={handleReset}
                    isSaving={isSaving}
                  />
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                {!analyzedData ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description" className="input-label">Job Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Paste the full job description here..."
                        value={manualDescription}
                        onChange={(e) => setManualDescription(e.target.value)}
                        className="min-h-[300px] resize-none"
                      />
                    </div>
                    <Button
                      onClick={handleAnalyzeManual}
                      disabled={isAnalyzing || !manualDescription.trim()}
                      className="w-full h-11"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        'Analyze'
                      )}
                    </Button>
                  </div>
                ) : (
                  <AnalyzedContent
                    data={analyzedData}
                    onSave={handleSave}
                    onReset={handleReset}
                    isSaving={isSaving}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface AnalyzedContentProps {
  data: AnalyzeJobResponse;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}

function AnalyzedContent({ data, onSave, onReset, isSaving }: AnalyzedContentProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with company info */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">{data.jobTitle}</h3>
          <p className="text-muted-foreground">{data.companyName}</p>
        </div>
        <MatchScoreBadge score={data.matchScore} className="text-sm" />
      </div>

      {/* Job Description */}
      <div>
        <Label className="input-label">Job Description</Label>
        <div className="mt-1.5 p-4 rounded-lg bg-muted/50 max-h-[300px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans">
            {data.jobDescription}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="ghost" onClick={onReset}>
          Start Over
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
