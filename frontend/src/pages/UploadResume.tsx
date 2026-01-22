import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowLeft, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { uploadResume } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function UploadResume() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
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
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !name.trim()) {
            toast({
                title: 'Missing information',
                description: 'Please select a file and provide a name',
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        try {
            await uploadResume(file, name);
            setIsSuccess(true);
            toast({
                title: 'Success',
                description: 'Resume uploaded and processed successfully',
            });
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: 'There was an error uploading your resume',
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
                <h1 className="page-title">Upload My Resume</h1>
                <p className="page-description">Upload your master resume (PDF) for AI tailoring</p>
            </div>

            <div className="max-w-2xl">
                <div className="card-elevated p-8">
                    {isSuccess ? (
                        <div className="text-center py-8 animate-fade-in">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mb-4">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h2 className="text-2xl font-semibold mb-2">Resume Uploaded!</h2>
                            <p className="text-muted-foreground mb-6">
                                Your resume has been processed. Redirecting to dashboard...
                            </p>
                            <Button onClick={() => navigate('/')} variant="outline">
                                Go Now
                            </Button>
                        </div>
                    ) : (
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

                            <div className="space-y-2">
                                <Label className="input-label">Resume PDF <span className="text-destructive">*</span></Label>
                                <div
                                    className={cn(
                                        "relative border-2 border-dashed rounded-xl p-10 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5",
                                        file ? "border-primary bg-primary/5" : "border-muted"
                                    )}
                                    onClick={() => document.getElementById('resume-upload')?.click()}
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

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base"
                                    disabled={!file || !name.trim() || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Processing Resume...
                                        </>
                                    ) : (
                                        'Upload and Process'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
