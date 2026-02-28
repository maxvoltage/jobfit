import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Link2, FileText, Loader2, X, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { analyzeJobUrl, analyzeJobDescription, getResumes } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Resume } from '@/types';
import { ResumeSelector } from '@/components/ResumeSelector';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';

export default function NewApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('url');
  const [jobUrl, setJobUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [isResumeSelectorOpen, setIsResumeSelectorOpen] = useState(false);
  const [generateCv, setGenerateCv] = useState(false); // Default to JD only (false)

  const { data: resumes = [], refetch: refetchResumes } = useQuery({
    queryKey: ['resumes'],
    queryFn: getResumes,
  });

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const selected = resumes.find(r => r.is_selected) || resumes[0];
      setSelectedResumeId(selected.id.toString());
    }
  }, [resumes, selectedResumeId]);

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
      const result = await analyzeJobUrl(jobUrl, generateCv ? parseInt(selectedResumeId) : undefined, generateCv);

      // Invalidate applications query so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['applications'] });

      toast({
        title: 'Analysis Complete',
        description: 'Job analyzed successfully',
      });

      if (result.id) {
        navigate(`/job/${result.id}`);
      }
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
      const result = await analyzeJobDescription(manualDescription, generateCv ? parseInt(selectedResumeId) : undefined, generateCv);

      // Invalidate applications query so dashboard refreshes
      queryClient.invalidateQueries({ queryKey: ['applications'] });

      toast({
        title: 'Analysis Complete',
        description: 'Job description has been analyzed successfully',
      });

      if (result.id) {
        navigate(`/job/${result.id}`);
      }
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

  const CvToggle = ({ id }: { id: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="input-label cursor-pointer">Score & Generate Cover Letter</Label>
      <div className={`flex items-center space-x-3 p-4 border rounded-xl bg-primary/5 border-primary/10 transition-all ${!selectedResumeId ? 'opacity-40 pointer-events-none' : ''}`}>
        <Checkbox
          id={id}
          checked={generateCv}
          onCheckedChange={(checked) => setGenerateCv(!!checked)}
          disabled={!selectedResumeId}
          className="h-5 w-5"
        />
        <div className="grid gap-1.5 leading-none">
          <p className="text-xs text-muted-foreground flex items-center flex-wrap gap-2">
            {!selectedResumeId
              ? 'Select a resume to enable matching and CV generation.'
              : generateCv
                ? (
                  <span className="flex items-center gap-2">
                    Match with resume and generate CV
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Full Analysis
                    </span>
                  </span>
                )
                : (
                  <span className="flex items-center gap-2">
                    Only extract job details
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                      <Rocket className="h-2.5 w-2.5" /> Fast Mode
                    </span>
                  </span>
                )}
          </p>
        </div>
      </div>
    </div>
  );

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
        <p className="page-description">
          Job application link should not be behind a login or a paywall.<br />
          If you can't directly bring up the job description using the URL you see, it won't work.<br />
          (e.g., dynamically loaded job descriptions, certain bulletin boards, etc.)<br />
          You can always copy and paste the job description using the manual tab.
        </p>
      </div>

      <div className="max-w-3xl">
        <div className="card-elevated">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="input-label">Select Resume <span className="text-destructive">*</span></Label>
                    {resumes.length > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsResumeSelectorOpen(true)}
                        className="w-full justify-start h-11 font-normal"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {selectedResumeId
                          ? resumes.find(r => r.id.toString() === selectedResumeId)?.name || 'Select a resume'
                          : 'Select a resume'}
                      </Button>
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/30 text-sm">
                        No resumes found. <Link to="/upload" className="text-primary hover:underline">Upload one first</Link>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="jobUrl" className="input-label">Job URL <span className="text-destructive">*</span></Label>
                    <Input
                      id="jobUrl"
                      placeholder="https://careers.example.com/job/12345"
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <CvToggle id="generateCvUrl" />

                  <Button
                    onClick={handleAnalyzeUrl}
                    disabled={isAnalyzing || !jobUrl.trim()}
                    className="w-full h-11"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {selectedResumeId ? 'Analyzing...' : 'Extracting...'}
                      </>
                    ) : (
                      'Analyze'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="input-label">Select Resume <span className="text-destructive">*</span></Label>
                    {resumes.length > 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsResumeSelectorOpen(true)}
                        className="w-full justify-start h-11 font-normal"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {selectedResumeId
                          ? resumes.find(r => r.id.toString() === selectedResumeId)?.name || 'Select a resume'
                          : 'Select a resume'}
                      </Button>
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/30 text-sm">
                        No resumes found. <Link to="/upload" className="text-primary hover:underline">Upload one first</Link>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description" className="input-label">Job Description <span className="text-destructive">*</span></Label>
                    <Textarea
                      id="description"
                      placeholder="Paste the full job description here..."
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      className="min-h-[300px] resize-none"
                    />
                  </div>

                  <CvToggle id="generateCvManual" />

                  <Button
                    onClick={handleAnalyzeManual}
                    disabled={isAnalyzing || !manualDescription.trim()}
                    className="w-full h-11"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {selectedResumeId ? 'Analyzing...' : 'Extracting...'}
                      </>
                    ) : (
                      'Analyze'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      <ResumeSelector
        open={isResumeSelectorOpen}
        onOpenChange={setIsResumeSelectorOpen}
        resumes={resumes}
        selectedResumeId={selectedResumeId}
        onSelectResume={setSelectedResumeId}
        onResumeUpdate={refetchResumes}
      />
    </div>
  );
}
