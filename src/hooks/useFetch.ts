import React, { useState, useEffect, useRef } from 'react';
import { apiGet } from '../services/api';

interface UseFetchOptions<T> {
  initialData?: T;
  fallbackData?: T;
  timeoutMs?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

function useFetch<T = unknown>(
  url: string, 
  options?: Record<string, unknown>, 
  fetchOptions?: UseFetchOptions<T>
) {
  const [data, setData] = useState<T | undefined>(fetchOptions?.initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're using fallback data
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchData = async (abortController?: AbortController) => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching from: ${url}`);
      
      const response = await apiGet<T>(url);
      
      setData(response);
      setUsingFallback(false);
      fetchOptions?.onSuccess?.(response);
    } catch (err: unknown) {
      console.warn(`Fetch error:`, err);
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Handle fallback data if provided
      if (fetchOptions?.fallbackData !== undefined) {
        console.log(`Using fallback data for ${url}`);
        setData(fetchOptions.fallbackData);
        setUsingFallback(true);
        setError(`Using demo data (${errorMessage})`);
      } else {
        setError(errorMessage);
      }
      
      fetchOptions?.onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    if (url) {
      fetchData(abortController);
    } else {
      // If URL is empty, reset everything except for fallback data
      if (fetchOptions?.fallbackData !== undefined) {
        setData(fetchOptions.fallbackData);
        setUsingFallback(true);
        setError('Using demo data (no endpoint provided)');
      } else {
        setData(undefined);
        setError(null);
      }
      setLoading(false);
    }
    
    return () => {
      abortController.abort();
    };
  }, [url]);

  const refetch = () => fetchData();

  return { data, loading, error, refetch, usingFallback };
}

export default useFetch;