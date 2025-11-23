'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { createRoot, Root } from 'react-dom/client';
import MentionList from './MentionList';

interface MentionItem {
  id: string;
  label: string;
  email?: string;
}

interface ChatEditorProps {
  onSend: (content: string) => void;
  placeholder?: string;
}

export interface ChatEditorRef {
  clear: () => void;
  focus: () => void;
}

const ChatEditor = forwardRef<ChatEditorRef, ChatEditorProps>(
  ({ onSend, placeholder = 'Type a message...' }, ref) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [hasContent, setHasContent] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    const fetchSuggestions = async (
      query: string,
      type: 'user' | 'hashtag'
    ): Promise<MentionItem[]> => {
      try {
        const response = await fetch(
          `/api/mentions?query=${encodeURIComponent(query)}&type=${type}`
        );
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        return [];
      }
    };

  
    const editor = useEditor({
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        const textContent = editor.getText().trim();
        setHasContent(textContent !== '');
      },
      extensions: [
        StarterKit,
        Mention.configure({
          HTMLAttributes: {
            class: 'mention',
          },
          renderText({ node }) {
            const char = node.attrs.char || '@';
            return `${char}${node.attrs.label ?? node.attrs.id}`;
          },
          renderHTML({ node }) {
            const char = node.attrs.char || '@';
            const isHashtag = char === '#';
            return [
              'span',
              {
                class: isHashtag ? 'mention hashtag' : 'mention',
                'data-type': isHashtag ? 'hashtag' : 'user',
              },
              `${char}${node.attrs.label ?? node.attrs.id}`,
            ];
          },
          suggestion: {
            char: '@',
            items: async ({ query }: { query: string }) => {
              return await fetchSuggestions(query, 'user');
            },
            command: ({ editor, range, props }: any) => {
              const { id, label } = props;
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: 'mention',
                    attrs: { id, label, char: '@' },
                  },
                ])
                .run();
            },
            render: () => {
              let component: HTMLDivElement;
              let popup: TippyInstance[];
              let root: Root;

              return {
                onStart: (props: any) => {
                  component = document.createElement('div');
                  root = createRoot(component);
                  root.render(
                    <MentionList items={props.items} command={props.command} />
                  );
                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                  });
                },
                onUpdate: (props: any) => {
                  if (root) {
                    root.render(
                      <MentionList items={props.items} command={props.command} />
                    );
                  }
                },
                onKeyDown: (props: any) => {
                  if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                  }
                  return false;
                },
                onExit: () => {
                  if (root) {
                    root.unmount();
                  }
                  popup[0].destroy();
                },
              };
            },
          },
        }),
        Mention.extend({
          name: 'hashtag',
        }).configure({
          HTMLAttributes: {
            class: 'mention hashtag',
          },
          renderText({ node }) {
            return `#${node.attrs.label ?? node.attrs.id}`;
          },
          renderHTML({ node }) {
            return [
              'span',
              {
                class: 'mention hashtag',
                'data-type': 'hashtag',
              },
              `#${node.attrs.label ?? node.attrs.id}`,
            ];
          },
          suggestion: {
            char: '#',
            items: async ({ query }: { query: string }) => {
              return await fetchSuggestions(query, 'hashtag');
            },
            command: ({ editor, range, props }: any) => {
              const { id, label } = props;
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: 'hashtag',
                    attrs: { id, label },
                  },
                ])
                .run();
            },
            render: () => {
              let component: HTMLDivElement;
              let popup: TippyInstance[];
              let root: Root;

              return {
                onStart: (props: any) => {
                  component = document.createElement('div');
                  root = createRoot(component);
                  root.render(
                    <MentionList items={props.items} command={props.command} />
                  );
                  popup = tippy('body', {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: component,
                    showOnCreate: true,
                    interactive: true,
                    trigger: 'manual',
                    placement: 'bottom-start',
                  });
                },
                onUpdate: (props: any) => {
                  if (root) {
                    root.render(
                      <MentionList items={props.items} command={props.command} />
                    );
                  }
                },
                onKeyDown: (props: any) => {
                  if (props.event.key === 'Escape') {
                    popup[0].hide();
                    return true;
                  }
                  return false;
                },
                onExit: () => {
                  if (root) {
                    root.unmount();
                  }
                  popup[0].destroy();
                },
              };
            },
          },
        }),
      ],
      content: '',
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[60px] max-h-[200px] overflow-y-auto p-3',
        },
      },
    });

    useImperativeHandle(ref, () => ({
      clear: () => {
        editor?.commands.clearContent();
      },
      focus: () => {
        editor?.commands.focus();
      },
    }));

    const handleSend = () => {
      if (!editor) return;
      
      const content = editor.getHTML();
      const textContent = editor.getText().trim();
      
      if (content.trim() === '<p></p>' || content.trim() === '' || textContent === '') return;

      setIsLoading(true);
      onSend(content);
      
      // Clear editor after a short delay
      setTimeout(() => {
        editor.commands.clearContent();
        setIsLoading(false);
      }, 100);
    };


    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    if (!isMounted || !editor) {
      return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[60px] p-3">
          <div className="text-gray-400 dark:text-gray-500">Loading editor...</div>
        </div>
      );
    }

    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <EditorContent
            editor={editor}
            onKeyDown={handleKeyDown}
            className="editor-content"
          />
        </div>
        <div className="flex justify-end p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <button
            onClick={handleSend}
            disabled={isLoading || !hasContent}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    );
  }
);

ChatEditor.displayName = 'ChatEditor';

export default ChatEditor;
