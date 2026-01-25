import { useState, useEffect } from 'react';
import { Edit2, Save, X, Loader2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Resume } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ResumeEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resume: Resume;
    onSaveComplete: () => void;
}

export function ResumeEditor({
    open,
    onOpenChange,
    resume,
    onSaveComplete,
}: ResumeEditorProps) {
    const { toast } = useToast();
    const [editedContent, setEditedContent] = useState(resume.content);
    const [isSaving, setIsSaving] = useState(false);
    const [editTab, setEditTab] = useState<'edit' | 'preview'>('edit');

    // Sync state with prop when it changes or modal opens
    useEffect(() => {
        if (open) {
            setEditedContent(resume.content);
            setEditTab('edit');
        }
    }, [open, resume.content]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/resumes/${resume.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: resume.name,
                    content: editedContent,
                    is_selected: resume.is_selected,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update resume');
            }

            toast({
                title: 'Success',
                description: 'Resume updated successfully',
            });

            onSaveComplete();
            onOpenChange(false);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update resume',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedContent(resume.content);
        setEditTab('edit');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>Edit Resume: {resume.name}</DialogTitle>
                    <DialogDescription>
                        Make changes to your resume content. You can use Markdown formatting.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden p-6">
                    <Tabs value={editTab} onValueChange={(v) => setEditTab(v as 'edit' | 'preview')} className="h-full flex flex-col">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="edit" className="gap-2">
                                <Edit2 className="h-3 w-3" />
                                Edit
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                                <Eye className="h-3 w-3" />
                                Preview
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="edit" className="flex-1 mt-3">
                            <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="h-[calc(85vh-240px)] font-mono text-sm resize-none"
                                placeholder="Enter resume content in Markdown format..."
                            />
                        </TabsContent>

                        <TabsContent value="preview" className="flex-1 mt-3 overflow-auto">
                            <div className="h-[calc(85vh-240px)] p-4 rounded-lg border bg-background overflow-auto">
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                    <ReactMarkdown
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
                                        {editedContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="p-6 border-t bg-background">
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
