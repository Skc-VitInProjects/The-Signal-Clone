'use client';

import React, { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onChange: (val: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ query, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search, Esc to clear
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('');
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className="search-container">
      <div className="search-bar">
        <Search size={16} color="var(--text-muted)" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search conversations & contacts (Ctrl+K)"
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        {query && (
          <button
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <X size={14} color="var(--text-muted)" />
          </button>
        )}
      </div>
    </div>
  );
};
