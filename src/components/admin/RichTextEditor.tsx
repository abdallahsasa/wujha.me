import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2,
  AlignRight, AlignCenter, AlignLeft, Link as LinkIcon, Image as ImageIcon, List, ListOrdered,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: content || "<p></p>",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Listen for variable insertion
  useEffect(() => {
    const handler = (e: Event) => {
      const variable = (e as CustomEvent).detail;
      if (editor) {
        editor.chain().focus().insertContent(variable).run();
      }
    };
    window.addEventListener("insert-template-variable", handler);
    return () => window.removeEventListener("insert-template-variable", handler);
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = prompt("أدخل الرابط:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = prompt("أدخل رابط الصورة:");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        <ToolBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="عريض">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="مائل">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="تحته خط">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-8 bg-border mx-1" />
        <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="عنوان رئيسي">
          <Heading1 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="عنوان فرعي">
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-8 bg-border mx-1" />
        <ToolBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="محاذاة يمين">
          <AlignRight className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="توسيط">
          <AlignCenter className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="محاذاة يسار">
          <AlignLeft className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-8 bg-border mx-1" />
        <ToolBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="قائمة نقطية">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="قائمة مرقمة">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px h-8 bg-border mx-1" />
        <ToolBtn active={editor.isActive("link")} onClick={addLink} title="رابط">
          <LinkIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={addImage} title="صورة">
          <ImageIcon className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[300px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
        dir="rtl"
      />
    </div>
  );
}
