import { useState, useEffect, useCallback } from 'react';

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function useAddressSearch() {
  const [search, setSearch] = useState<string>('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAddresses = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=br&addressdetails=1`, 
        {
          headers: {
            'Accept-Language': 'pt-BR'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao buscar endereços');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Erro na busca de endereços:', err);
      setError('Falha ao buscar endereços. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Implementar debounce sem usar AbortController
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted && search && search.length >= 3) {
        fetchAddresses(search);
      }
    }, 500);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [search, fetchAddresses]);

  return {
    search,
    setSearch,
    results,
    isLoading,
    error
  };
}