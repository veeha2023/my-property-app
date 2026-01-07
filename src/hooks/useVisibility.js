import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook to detect when the tab/window becomes visible or hidden
 * Prevents unnecessary data fetching when user switches tabs
 */
export const useVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => setIsVisible(true));
    window.addEventListener('blur', () => setIsVisible(false));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => setIsVisible(true));
      window.removeEventListener('blur', () => setIsVisible(false));
    };
  }, []);

  return isVisible;
};

/**
 * Hook to auto-save data with debouncing
 * @param {Function} saveFunction - The function to call for saving
 * @param {number} delay - Debounce delay in milliseconds (default: 2000ms)
 */
export const useAutoSave = (saveFunction, delay = 2000) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const saveCountRef = useRef(0);

  const debouncedSave = useCallback(
    (data) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for save
      timeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await saveFunction(data);
          setLastSaved(new Date());
          saveCountRef.current += 1;
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }, delay);
    },
    [saveFunction, delay]
  );

  const saveImmediately = useCallback(
    async (data) => {
      // Clear any pending debounced save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsSaving(true);
      try {
        await saveFunction(data);
        setLastSaved(new Date());
        saveCountRef.current += 1;
      } catch (error) {
        console.error('Immediate save failed:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [saveFunction]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    debouncedSave,
    saveImmediately,
    isSaving,
    lastSaved,
    saveCount: saveCountRef.current,
  };
};

/**
 * Hook to prevent data fetching when tab visibility changes
 * Only fetches data on initial mount or when explicitly triggered
 * @param {Function} fetchFunction - The function to call for fetching data
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {boolean} skipOnHidden - Whether to skip fetch when tab becomes visible again
 */
export const useVisibilityAwareFetch = (fetchFunction, dependencies = [], skipOnHidden = true) => {
  const isVisible = useVisibility();
  const hasFetchedRef = useRef(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Always fetch on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      hasFetchedRef.current = true;
      fetchFunction();
      return;
    }

    // If skipOnHidden is true, don't re-fetch when tab becomes visible
    if (skipOnHidden && !isVisible) {
      return;
    }

    // Only fetch if tab is visible and we haven't fetched yet
    if (isVisible && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchFunction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, ...dependencies]);

  return { isVisible, refetch: () => fetchFunction() };
};
