import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps-api';

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  placeholder: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

interface PlacePrediction {
  description: string;
  place_id: string;
}

export default function GooglePlacesInput({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  icon,
  className = ''
}: GooglePlacesInputProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const dummyElement = useRef<HTMLDivElement | null>(null);

  // Inicializar os serviços do Google Places quando o componente for montado
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      
      // O PlacesService precisa de um elemento DOM para ser inicializado
      if (!placesService.current && dummyElement.current) {
        placesService.current = new google.maps.places.PlacesService(dummyElement.current);
      }
    }
  }, []);

  // Buscar previsões quando o usuário digitar
  useEffect(() => {
    if (!value || value.length < 3 || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      autocompleteService.current?.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: 'br' },
          language: 'pt-BR'
        },
        (results, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setPredictions([]);
          } else {
            console.error('Erro na busca de endereços:', status);
            setError('Falha ao buscar endereços. Tente novamente.');
            setPredictions([]);
          }
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Função para obter detalhes do local selecionado
  const getPlaceDetails = (placeId: string) => {
    if (!placesService.current) return;

    placesService.current.getDetails(
      {
        placeId: placeId,
        fields: ['formatted_address', 'geometry']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || '';
          const location = place.geometry?.location;
          
          if (location) {
            onSelect(address, location.lat(), location.lng());
          }
        } else {
          console.error('Erro ao obter detalhes do local:', status);
        }
      }
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Elemento invisível para o PlacesService */}
      <div ref={dummyElement} style={{ display: 'none' }}></div>
      
      {label && label}
      
      <div className="flex items-center relative">
        {icon && <div className="absolute left-3">{icon}</div>}
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={icon ? 'pl-10' : ''}
          placeholder={placeholder}
        />
      </div>
      
      {/* Sugestões de endereços */}
      {(predictions.length > 0 || isLoading || error) && (
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
          
          {predictions.length > 0 && (
            <ul className="space-y-1">
              {predictions.map((prediction) => (
                <li
                  key={prediction.place_id}
                  onClick={() => {
                    getPlaceDetails(prediction.place_id);
                    setPredictions([]);
                  }}
                  className="text-sm p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                >
                  {prediction.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}