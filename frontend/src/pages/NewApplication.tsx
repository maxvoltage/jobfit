import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Link2, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { analyzeJobUrl, analyzeJobDescription, getResumes } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AnalyzeJobResponse, Resume } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('url');
  const [jobUrl, setJobUrl] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const data = await getResumes();
        setResumes(data);
        if (data.length > 0) {
          const master = data.find(r => r.is_master) || data[0];
          setSelectedResumeId(master.id.toString());
        }
      } catch (error) {
        console.error('Failed to fetch resumes:', error);
      }
    };
    fetchResumes();
  }, []);

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
      const result = await analyzeJobUrl(jobUrl, parseInt(selectedResumeId));
      toast({
        title: 'Analysis Complete',
        description: 'Job analyzed successfully',
      });
      // Redirect immediately since it's already saved
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
      const result = await analyzeJobDescription(manualDescription, parseInt(selectedResumeId));
      toast({
        title: 'Analysis Complete',
        description: 'Job description has been analyzed successfully',
      });
      // Redirect immediately since it's already saved
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
                      <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resume" />
                        </SelectTrigger>
                        <SelectContent>
                          {resumes.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name} {r.is_master ? '(Master)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              </TabsContent>

              <TabsContent value="manual" className="mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="input-label">Select Resume <span className="text-destructive">*</span></Label>
                    {resumes.length > 0 ? (
                      <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resume" />
                        </SelectTrigger>
                        <SelectContent>
                          {resumes.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>
                              {r.name} {r.is_master ? '(Master)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
