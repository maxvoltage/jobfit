import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Undo,
    Redo,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    className?: string;
}

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    const toggleLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/50 border-b rounded-t-lg">
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('bold') && "bg-muted-foreground/20")}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('italic') && "bg-muted-foreground/20")}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('underline') && "bg-muted-foreground/20")}
                    title="Underline"
                >
                    <UnderlineIcon className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 1 }) && "bg-muted-foreground/20")}
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 2 }) && "bg-muted-foreground/20")}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('heading', { level: 3 }) && "bg-muted-foreground/20")}
                    title="Heading 3"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('bulletList') && "bg-muted-foreground/20")}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-8 w-8 p-0", editor.isActive('orderedList') && "bg-muted-foreground/20")}
                    title="Numbered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'left' }) && "bg-muted-foreground/20")}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'center' }) && "bg-muted-foreground/20")}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: 'right' }) && "bg-muted-foreground/20")}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleLink}
                    className={cn("h-8 w-8 p-0", editor.isActive('link') && "bg-muted-foreground/20")}
                    title="Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0"
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0"
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export function RichTextEditor({ content, onChange, className }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6 font-sans",
                    className
                ),
            },
        },
        immediatelyRender: false,
    });

    return (
        <div className="flex flex-col border rounded-lg overflow-hidden bg-background">
            <EditorToolbar editor={editor} />
            <div className="overflow-y-auto max-h-[600px]">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
