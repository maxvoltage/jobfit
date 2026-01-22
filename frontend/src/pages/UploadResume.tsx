import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Loader2, FileText, CheckCircle2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadResume, importResumeFromUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UploadResume() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('url');
    const [file, setFile] = useState<File | null>(null);
    const [resumeUrl, setResumeUrl] = useState('');
    const [name, setName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleSelectedFile(e.target.files[0]);
        }
    };

    const handleSelectedFile = (selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf') {
            toast({
                title: 'Invalid file type',
                description: 'Please upload a PDF file',
                variant: 'destructive',
            });
            return;
        }
        setFile(selectedFile);
        if (!name) {
            setName(selectedFile.name.replace('.pdf', ''));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleSelectedFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast({
                title: 'Missing information',
                description: 'Please provide a name for this resume',
                variant: 'destructive',
            });
            return;
        }

        if (activeTab === 'file' && !file) {
            toast({
                title: 'Missing file',
                description: 'Please select a PDF file to upload',
                variant: 'destructive',
            });
            return;
        }

        if (activeTab === 'url' && !resumeUrl.trim()) {
            toast({
                title: 'Missing URL',
                description: 'Please provide a URL to import from',
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        try {
            if (activeTab === 'file' && file) {
                await uploadResume(file, name);
            } else if (activeTab === 'url') {
                await importResumeFromUrl(resumeUrl, name);
            }

            setIsSuccess(true);
            toast({
                title: 'Success',
                description: 'Resume processed successfully',
            });
            setTimeout(() => navigate('/'), 2000);
        } catch (error: any) {
            toast({
                title: 'Process failed',
                description: error.message || 'There was an error processing your resume',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
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
                <h1 className="page-title">Add My Resume</h1>
                <p className="page-description">Add your master resume (PDF or URL) for AI tailoring</p>
            </div>

            <div className="max-w-3xl">
                <div className="card-elevated">
                    {isSuccess ? (
                        <div className="text-center py-16 animate-fade-in">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-4">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2">Resume Added!</h2>
                            <p className="text-muted-foreground mb-6">
                                Your resume has been processed. Redirecting to dashboard...
                            </p>
                            <Button onClick={() => navigate('/')} variant="outline">
                                Go Now
                            </Button>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="w-full grid grid-cols-2 m-4 max-w-md">
                                <TabsTrigger value="url" className="gap-2">
                                    <Globe className="h-4 w-4" />
                                    From URL
                                </TabsTrigger>
                                <TabsTrigger value="file" className="gap-2">
                                    <FileText className="h-4 w-4" />
                                    PDF File
                                </TabsTrigger>
                            </TabsList>

                            <div className="p-6 pt-2">
                                <form onSubmit={handleUpload} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="resume-name" className="input-label">Resume Name (Description) <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="resume-name"
                                            placeholder="e.g. Master Backend Engineer CV"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="h-11"
                                        />
                                    </div>

                                    <TabsContent value="file" className="mt-0">
                                        <div className="space-y-2">
                                            <Label className="input-label">Resume PDF <span className="text-destructive">*</span></Label>
                                            <div
                                                className={cn(
                                                    "relative border-2 border-dashed rounded-xl p-10 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5",
                                                    file ? "border-primary bg-primary/5" : "border-muted",
                                                    isDragging && "border-primary bg-primary/10 scale-[1.02]"
                                                )}
                                                onClick={() => document.getElementById('resume-upload')?.click()}
                                                onDragOver={handleDragOver}
                                                onDragLeave={handleDragLeave}
                                                onDrop={handleDrop}
                                            >
                                                <input
                                                    id="resume-upload"
                                                    type="file"
                                                    accept=".pdf"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />

                                                {file ? (
                                                    <>
                                                        <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                            <FileText className="h-6 w-6" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-medium text-foreground">{file.name}</p>
                                                            <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFile(null);
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="font-medium">Click to upload or drag and drop</p>
                                                            <p className="text-sm text-muted-foreground">PDF (max. 10MB)</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="url" className="mt-0">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="resume-url" className="input-label">LinkedIn or Portfolio URL <span className="text-destructive">*</span></Label>
                                                <div className="relative">
                                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                    <Input
                                                        id="resume-url"
                                                        placeholder="https://linkedin.com/in/username"
                                                        value={resumeUrl}
                                                        onChange={(e) => setResumeUrl(e.target.value)}
                                                        className="h-11 pl-10"
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1.5">
                                                    Paste the public URL to your professional profile or portfolio
                                                </p>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 text-base"
                                            disabled={(activeTab === 'file' ? !file : !resumeUrl.trim()) || !name.trim() || isUploading}
                                        >
                                            {isUploading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Processing Resume...
                                                </>
                                            ) : (
                                                activeTab === 'file' ? 'Upload and Process' : 'Import and Process'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}
