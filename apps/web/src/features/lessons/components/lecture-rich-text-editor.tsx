"use client";

import { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw } from "lucide-react";

type LectureRichTextEditorProps = {
  content: Record<string, unknown> | null | undefined;
  editable?: boolean;
  onChange?: (nextContent: Record<string, unknown>) => void;
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

export function LectureRichTextEditor({
  content,
  editable = true,
  onChange,
}: LectureRichTextEditorProps) {
  const normalizedContent = useMemo<JSONContent>(() => {
    if (!content || typeof content !== "object") {
      return EMPTY_DOC;
    }

    return content as JSONContent;
  }, [content]);

  const contentFingerprint = useMemo(
    () => JSON.stringify(normalizedContent),
    [normalizedContent],
  );

  const editor = useEditor({
    extensions: [StarterKit],
    content: normalizedContent,
    editable,
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-4 py-3 text-sm leading-6 text-gray-700 outline-none [&_p]:my-2 [&_h1]:my-3 [&_h1]:text-2xl [&_h2]:my-3 [&_h2]:text-xl [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (!onChange) return;
      onChange(currentEditor.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;

    const currentFingerprint = JSON.stringify(editor.getJSON());
    if (currentFingerprint !== contentFingerprint) {
      editor.commands.setContent(normalizedContent, false);
    }
  }, [editor, contentFingerprint, normalizedContent]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      {editable ? <EditorToolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}

type EditorToolbarProps = {
  editor: ReturnType<typeof useEditor>;
};

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
        <span className="text-xs text-gray-500">Загрузка редактора...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 p-3">
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
        <RotateCcw />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
        <RotateCw />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Жирный
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Курсив
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        Маркеры
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        Нумерация
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        Заголовок
      </ToolbarButton>
    </div>
  );
}

type ToolbarButtonProps = {
  active?: boolean;
  onClick: () => void;
  children: any;
};

function ToolbarButton({
  active = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "primary" : "secondary"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
