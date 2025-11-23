import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { openSuggestions, closeSuggestions, setSuggestions, setLoading } from '../slices/chatSlice';
import { useSocket, useSocketEmit } from './useSocket';
import type { Suggestion } from '../slices/chatSlice';

export function useAutocomplete() {
  const dispatch = useAppDispatch();
  const { suggestions, isSuggestionsOpen } = useAppSelector(state => state.chat);
  const emit = useSocketEmit();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for autocomplete responses
  useSocket('autocomplete-response', (data) => {
    dispatch(setLoading(false));
    dispatch(setSuggestions(data.suggestions));
  });

  useSocket('autocomplete-error', () => {
    dispatch(setLoading(false));
    dispatch(closeSuggestions());
  });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const requestSuggestions = useCallback((query: string, trigger: '@' | '#', position: { top: number; left: number }) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Always open suggestions immediately for better UX
    dispatch(openSuggestions({ query, trigger, position }));
    dispatch(setLoading(true));

    // Use shorter debounce for real-time feel (150ms instead of 300ms)
    // If query is empty, send immediately
    const debounceTime = query.trim() === '' ? 0 : 150;
    
    debounceTimerRef.current = setTimeout(() => {
      emit('autocomplete-request', { query: query.trim(), trigger });
    }, debounceTime);
  }, [dispatch, emit]);

  const close = useCallback(() => {
    // Clear debounce timer when closing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    dispatch(closeSuggestions());
  }, [dispatch]);

  return {
    suggestions,
    isOpen: isSuggestionsOpen,
    requestSuggestions,
    close,
  };
}

