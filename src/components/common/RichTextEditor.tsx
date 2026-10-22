'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Heading2, Heading3, List, ListOrdered, Link2, Quote, RemoveFormatting } from 'lucide-react';
import { sanitizeRichTextHtml } from '../../utils/richText';
import '../../styles/cms-rich-text.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const toolbarButtonClass = 'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedValue = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastEmittedValue.current === value) return;
    const safeValue = sanitizeRichTextHtml(value);
    if (editor.innerHTML !== safeValue) editor.innerHTML = safeValue;
    lastEmittedValue.current = value;
  }, [value]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const safeHtml = sanitizeRichTextHtml(editor.innerHTML);
    lastEmittedValue.current = safeHtml;
    onChange(safeHtml);
  }, [onChange]);

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const addLink = () => {
    const rawUrl = window.prompt('Enter a link URL (https://, mailto:, or tel:)');
    if (!rawUrl) return;
    const url = rawUrl.trim();
    if (!/^(https?:\/\/|mailto:|tel:)[^\s<>]*$/i.test(url) || /[\u0000-\u001f&"']/.test(url)) {
      window.alert('Please enter a valid HTTPS, email, or telephone link.');
      return;
    }
    runCommand('createLink', url);
  };

  const tools = [
    { label: 'Bold', icon: Bold, action: () => runCommand('bold') },
    { label: 'Italic', icon: Italic, action: () => runCommand('italic') },
    { label: 'Underline', icon: Underline, action: () => runCommand('underline') },
    { label: 'Heading 2', icon: Heading2, action: () => runCommand('formatBlock', 'h2') },
    { label: 'Heading 3', icon: Heading3, action: () => runCommand('formatBlock', 'h3') },
    { label: 'Bullet list', icon: List, action: () => runCommand('insertUnorderedList') },
    { label: 'Numbered list', icon: ListOrdered, action: () => runCommand('insertOrderedList') },
    { label: 'Quote', icon: Quote, action: () => runCommand('formatBlock', 'blockquote') },
    { label: 'Add link', icon: Link2, action: addLink },
    { label: 'Clear formatting', icon: RemoveFormatting, action: () => runCommand('removeFormat') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 bg-slate-50 p-2" role="toolbar" aria-label="Page content formatting">
        {tools.map(({ label, icon: Icon, action }) => (
          <button key={label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={action} title={label} aria-label={label} className={toolbarButtonClass}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Page content"
        aria-multiline="true"
        data-placeholder={placeholder || 'Write your page content...'}
        onInput={emitChange}
        onBlur={emitChange}
        className="cms-rich-editor min-h-56 max-h-[420px] overflow-y-auto px-4 py-3 text-sm leading-7 text-slate-800 focus:outline-none"
      />
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
        <span>Formatting is saved with the page.</span>
        <span>Headings · Lists · Links</span>
      </div>
    </div>
  );
};
