import React from 'react';
import { Loader2 } from "lucide-react";

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressSuggestionsProps {
  results: AddressResult[];
  isLoading: boolean;
  error: string | null;
  onSelect: (address: string, lat: number, lng: number) => void;
}

export default function AddressSuggestions({ 
  results, 
  isLoading, 
  error, 
  onSelect 
}: AddressSuggestionsProps) {
  // Se não houver resultados, erro ou carregamento, não renderiza nada
  if (results.length === 0 && !isLoading && !error) {
    return null;
  }

  return (
    <div className="absolute z-50 bg-white w-full border border-gray-200 rounded-md shadow-lg p-2 mt-1 max-h-60 overflow-y-auto">
      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin mr-2" />
          <span className="text-sm text-gray-500">Buscando endereços...</span>
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-500 p-2">{error}</div>
      )}
      
      {results.length > 0 && (
        <ul className="space-y-1">
          {results.map((result, index) => (
            <li
              key={index}
              onClick={() => {
                onSelect(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
              }}
              className="text-sm p-2 cursor-pointer hover:bg-gray-100 rounded-md"
            >
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}