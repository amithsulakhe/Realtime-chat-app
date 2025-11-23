'use client';

import { useEffect, useState } from 'react';

interface MentionItem {
  id: string;
  label: string;
  email?: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export default function MentionList({ items, command }: MentionListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'Enter'];
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.includes(e.key)) {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          setSelectedIndex((index) => (index + items.length - 1) % items.length);
        } else if (e.key === 'ArrowDown') {
          setSelectedIndex((index) => (index + 1) % items.length);
        } else if (e.key === 'Enter') {
          command(items[selectedIndex]);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [items, selectedIndex, command]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[200px]">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command(item)}
            className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              index === selectedIndex
                ? 'bg-gray-100 dark:bg-gray-700'
                : ''
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {item.label}
            </div>
            {item.email && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {item.email}
              </div>
            )}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
          No results found
        </div>
      )}
    </div>
  );
}

