import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Space } from "antd";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function RichBlockEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rich-block">
      <Space size={4} wrap style={{ marginBottom: 6 }}>
        <Button
          size="small"
          type={editor.isActive("bold") ? "primary" : "default"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Button>
        <Button
          size="small"
          type={editor.isActive("italic") ? "primary" : "default"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <Button
          size="small"
          type={editor.isActive("bulletList") ? "primary" : "default"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • 列表
        </Button>
        <Button
          size="small"
          type={editor.isActive("orderedList") ? "primary" : "default"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. 列表
        </Button>
      </Space>
      <EditorContent editor={editor} className="rich-editor" />
    </div>
  );
}
