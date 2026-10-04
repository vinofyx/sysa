'use client';

import * as React from 'react';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'img',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt'];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Deliberately minimal WYSIWYG (Bold/Italic/Headings/Lists/Link/Image) per
 * design/07-Component-Library.md §5.4 — not a full desktop-publishing
 * toolset, matching the non-technical admin persona (NFR-USE-02). Built on
 * `contentEditable` + `document.execCommand` rather than pulling in a full
 * editor framework (Tiptap/Slate/Quill): still broadly supported for these
 * basic commands and keeps the dependency footprint minimal. Output is
 * sanitized (DOMPurify) both on every change and again defensively before
 * render anywhere it's displayed (documentation/12-Security-Requirements.md
 * XSS requirement for rich-text CMS fields).
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const lastValue = React.useRef(value);

  React.useEffect(() => {
    if (
      editorRef.current &&
      value !== lastValue.current &&
      document.activeElement !== editorRef.current
    ) {
      editorRef.current.innerHTML = value || '';
      lastValue.current = value;
    }
  }, [value]);

  function emitChange() {
    if (!editorRef.current) return;
    const clean = sanitizeRichText(editorRef.current.innerHTML);
    lastValue.current = clean;
    onChange(clean);
  }

  function exec(command: string, arg?: string) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt('Link URL');
    if (url) exec('createLink', url);
  }

  function insertImage() {
    const url = window.prompt('Image URL');
    if (url) exec('insertImage', url);
  }

  const isEmpty = !value || value === '<p></p>' || value === '<br>';

  return (
    <div
      className={cn(
        'border-input focus-within:border-ring focus-within:ring-ring/50 rounded-lg border transition-colors focus-within:ring-3',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Bold"
          onClick={() => exec('bold')}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Italic"
          onClick={() => exec('italic')}
        >
          <Italic />
        </Button>
        <Separator orientation="vertical" className="mx-0.5 h-5" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Heading 2"
          onClick={() => exec('formatBlock', '<h2>')}
        >
          <Heading2 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Heading 3"
          onClick={() => exec('formatBlock', '<h3>')}
        >
          <Heading3 />
        </Button>
        <Separator orientation="vertical" className="mx-0.5 h-5" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Bullet list"
          onClick={() => exec('insertUnorderedList')}
        >
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Numbered list"
          onClick={() => exec('insertOrderedList')}
        >
          <ListOrdered />
        </Button>
        <Separator orientation="vertical" className="mx-0.5 h-5" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Insert link"
          onClick={insertLink}
        >
          <LinkIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Insert image"
          onClick={insertImage}
        >
          <ImageIcon />
        </Button>
      </div>
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 text-sm">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          className="[&_a]:text-primary min-h-32 px-2.5 py-2 text-sm outline-none [&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}
