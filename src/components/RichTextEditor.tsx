import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, List, ListOrdered, Heading2, Image as ImageIcon, Link as LinkIcon, Undo, Redo, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function RichTextEditor({ content, onChange }: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your article..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
  });

  if (!editor) return null;

  const toggleHtmlMode = () => {
    if (htmlMode) {
      // Switching back to visual — apply raw HTML
      editor.commands.setContent(rawHtml);
      onChange(rawHtml);
    } else {
      setRawHtml(editor.getHTML());
    }
    setHtmlMode(!htmlMode);
  };

  const addImage = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) return;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl }).run();
    };
    input.click();
  };

  const addLink = () => {
    const url = prompt("Enter URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
        {!htmlMode && (
          <>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold")}><Bold className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={addImage}><ImageIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={addLink}><LinkIcon className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Button>
          </>
        )}
        <Button type="button" variant={htmlMode ? "default" : "ghost"} size="icon" className="h-8 w-8 ml-auto" onClick={toggleHtmlMode} title="Toggle HTML"><Code className="h-4 w-4" /></Button>
      </div>
      {htmlMode ? (
        <Textarea
          value={rawHtml}
          onChange={(e) => { setRawHtml(e.target.value); onChange(e.target.value); }}
          className="min-h-[60vh] md:min-h-[500px] font-mono text-xs border-0 rounded-none focus-visible:ring-0 resize-y"
          placeholder="<p>Write HTML here...</p>"
        />
      ) : (
        <div className="min-h-[60vh] md:min-h-[500px] max-h-[75vh] overflow-y-auto px-3 py-2 prose prose-sm md:prose-base max-w-none [&_.ProseMirror]:min-h-[55vh] [&_.ProseMirror]:outline-none">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
