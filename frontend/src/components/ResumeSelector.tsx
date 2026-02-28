import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Check, ExternalLink, Edit2, Printer, FileDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Resume } from '@/types';
import { cn } from '@/lib/utils';
import { ResumeEditor } from './ResumeEditor';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { downloadResumePdf, downloadResumeDocx } from '@/lib/api';

interface ResumeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resumes: Resume[];
    selectedResumeId: string;
    onSelectResume: (resumeId: string) => void;
    onResumeUpdate?: () => void;
}

export function ResumeSelector({
    open,
    onOpenChange,
    resumes,
    selectedResumeId,
    onSelectResume,
    onResumeUpdate,
}: ResumeSelectorProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    // Find the currently selected resume or use the provided selectedResumeId
    const selectedResume = resumes.find(r => r.isSelected);
    const initialPreviewId = selectedResume ? selectedResume.id.toString() : selectedResumeId;

    const [previewResumeId, setPreviewResumeId] = useState<string>(initialPreviewId);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const previewResume = resumes.find(r => r.id.toString() === previewResumeId);

    const handlePrint = () => {
        if (!previewResumeId) return;

        toast({
            title: "Download Started",
            description: "Your PDF is being generated and will download shortly.",
        });

        downloadResumePdf(previewResumeId);
    };

    const handleDownloadWord = () => {
        if (!previewResumeId) return;

        toast({
            title: "Download Started",
            description: "Your Word document is being generated and will download shortly.",
        });

        downloadResumeDocx(previewResumeId);
    };

    // Reset preview to the selected resume only when the modal is FIRST opened
    useEffect(() => {
        if (open) {
            const currentSelected = resumes.find(r => r.isSelected) || resumes[0];
            if (currentSelected) {
                setPreviewResumeId(currentSelected.id.toString());
            }
        }
    }, [open, resumes]); // Run when modal opens or resumes list changes

    const handleSelect = async () => {
        // Call the new endpoint to set this resume as selected
        try {
            await fetch(`/api/resumes/${previewResumeId}/select`, {
                method: 'POST',
            });

            onSelectResume(previewResumeId);

            // Invalidate resumes query
            queryClient.invalidateQueries({ queryKey: ['resumes'] });
            queryClient.invalidateQueries({ queryKey: ['selectedResume'] });

            // Refresh the resumes list to update the selected state
            if (onResumeUpdate) {
                onResumeUpdate();
            }

            toast({
                title: "Resume Selected",
                description: "This resume will be used for your application.",
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Failed to set selected resume:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to select resume. Please try again.",
            });
        }
    };

    const handleEditComplete = () => {
        if (onResumeUpdate) {
            onResumeUpdate();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[85vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>Select Your Resume</DialogTitle>
                    <DialogDescription>
                        Choose which resume to use for this job application
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Resume List */}
                    <div className="w-80 border-r flex flex-col">
                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-2">
                                {resumes.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No resumes found</p>
                                        <Link
                                            to="/upload"
                                            className="text-primary hover:underline text-sm mt-2 inline-block"
                                            onClick={() => onOpenChange(false)}
                                        >
                                            Upload your first resume
                                        </Link>
                                    </div>
                                ) : (
                                    resumes.map((resume) => (
                                        <button
                                            key={resume.id}
                                            onClick={() => setPreviewResumeId(resume.id.toString())}
                                            className={cn(
                                                "w-full text-left p-3 rounded-lg border transition-all",
                                                "hover:bg-accent hover:border-primary/50",
                                                previewResumeId === resume.id.toString()
                                                    ? "bg-accent border-primary shadow-sm"
                                                    : "border-border"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        <span className="font-medium text-sm truncate">
                                                            {resume.name}
                                                        </span>
                                                    </div>
                                                    {resume.isSelected && (
                                                        <span className="text-xs text-primary mt-1 inline-block">
                                                            Currently Selected
                                                        </span>
                                                    )}
                                                </div>
                                                {selectedResumeId === resume.id.toString() && (
                                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {resumes.length > 0 && (
                            <div className="p-4 border-t">
                                <Link
                                    to="/upload"
                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                    onClick={() => onOpenChange(false)}
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Upload new resume
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Resume Preview */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {previewResume ? (
                            <>
                                <div className="flex-1 overflow-auto p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold">{previewResume.name}</h3>
                                            {previewResume.isSelected && (
                                                <p className="text-sm text-muted-foreground">Currently Selected</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handlePrint}
                                                className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                                            >
                                                <Printer className="h-3 w-3" />
                                                PDF
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleDownloadWord}
                                                className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                                            >
                                                <FileDown className="h-3 w-3" />
                                                Word
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => setIsEditorOpen(true)}
                                                className="gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all font-semibold"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                                Edit
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkBreaks]}
                                            components={{
                                                p: ({ children }) => <p className="mb-4 break-words">{children}</p>,
                                                h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-6 break-words">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-xl font-bold mb-2 mt-5 break-words">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 break-words">{children}</h3>,
                                                ul: ({ children }) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4">{children}</ol>,
                                                li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
                                                strong: ({ children }) => <strong className="font-bold break-words">{children}</strong>,
                                                em: ({ children }) => <em className="italic break-words">{children}</em>,
                                            }}
                                        >
                                            {previewResume.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div className="p-6 border-t bg-background">
                                    <div className="flex gap-3 justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={() => onOpenChange(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleSelect}
                                            disabled={!previewResumeId}
                                            className="bg-primary/20 hover:bg-primary/30 border border-primary/30 transition-all font-semibold"
                                        >
                                            {selectedResumeId === previewResumeId ? 'Keep Selection' : 'Use This Resume'}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p>Select a resume to preview</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            {previewResume && (
                <ResumeEditor
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    resume={previewResume}
                    onSaveComplete={handleEditComplete}
                />
            )}
        </Dialog>
    );
}
