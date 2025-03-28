import { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Plus, Minus, LocateFixed, Car, MapPin, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps-api';

interface MapLocation {
  lat: number;
  lng: number;
  type: 'origin' | 'destination' | 'driver';
}

interface RouteInfo {
  distance: number; // em km
  duration: number; // em minutos
}

interface MapProps {
  locations?: MapLocation[];
  className?: string;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onRouteCalculated?: (routeInfo: RouteInfo) => void;
}

// Estilos para o mapa
const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

// Opções do mapa
const defaultOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

// Cores para os marcadores
const markerColors = {
  origin: '#1E40AF', // Azul escuro
  destination: '#F59E0B', // Âmbar
  driver: '#10B981', // Verde
};

export default function Map({ locations = [], className = '', onLocationUpdate, onRouteCalculated }: MapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [zoom, setZoom] = useState(13);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const { toast } = useToast();
  
  // Referência para o serviço de direções
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  
  // Inicializamos com uma localização padrão (São Paulo)
  const defaultLocation = { lat: -23.5505, lng: -46.6333 };
  
  // Função para obter a localização atual do usuário
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'Erro de localização',
        description: 'Geolocalização não é suportada pelo seu navegador',
        variant: 'destructive',
      });
      setLocationError('Geolocalização não suportada');
      return;
    }
    
    setIsLocating(true);
    setLocationError(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(newLocation);
        setIsLocating(false);
        
        // Centralizar o mapa na nova localização
        if (map) {
          map.panTo(newLocation);
        }
        
        // Notificar o componente pai sobre a atualização da localização
        if (onLocationUpdate) {
          onLocationUpdate(newLocation);
        }
        
        toast({
          title: 'Localização atualizada',
          description: 'Sua localização atual foi obtida com sucesso',
        });
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = 'Erro ao obter sua localização';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Você negou a permissão de localização';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informação de localização indisponível';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao tentar obter localização';
            break;
        }
        
        setLocationError(errorMessage);
        toast({
          title: 'Erro de localização',
          description: errorMessage,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, [toast, onLocationUpdate, map]);
  
  // Obter localização quando o componente é montado (apenas uma vez)
  useEffect(() => {
    // Usamos uma variável para garantir que a localização só será obtida na montagem inicial
    const shouldGetLocation = onLocationUpdate && !currentLocation;
    if (shouldGetLocation && isLoaded) {
      getCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);
  
  // Inicializar o serviço de direções quando a API for carregada
  useEffect(() => {
    if (isLoaded && !directionsService.current) {
      directionsService.current = new google.maps.DirectionsService();
    }
  }, [isLoaded]);
  
  // Referência para armazenar as coordenadas da última rota calculada
  const lastRouteRef = useRef<{
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
  }>({ origin: null, destination: null });

  // Calcular rota quando origem e destino estiverem disponíveis
  useEffect(() => {
    const originLocation = locations.find(loc => loc.type === 'origin');
    const destinationLocation = locations.find(loc => loc.type === 'destination');
    
    if (isLoaded && directionsService.current && originLocation && destinationLocation) {
      // Verificar se as coordenadas são as mesmas da última rota calculada
      const isSameOrigin = lastRouteRef.current.origin && 
        lastRouteRef.current.origin.lat === originLocation.lat && 
        lastRouteRef.current.origin.lng === originLocation.lng;
      
      const isSameDestination = lastRouteRef.current.destination && 
        lastRouteRef.current.destination.lat === destinationLocation.lat && 
        lastRouteRef.current.destination.lng === destinationLocation.lng;
      
      // Se ambos origem e destino são os mesmos, não recalcular a rota
      if (isSameOrigin && isSameDestination) {
        return;
      }
      
      // Atualizar as coordenadas da última rota
      lastRouteRef.current = {
        origin: { lat: originLocation.lat, lng: originLocation.lng },
        destination: { lat: destinationLocation.lat, lng: destinationLocation.lng }
      };
      
      directionsService.current.route(
        {
          origin: { lat: originLocation.lat, lng: originLocation.lng },
          destination: { lat: destinationLocation.lat, lng: destinationLocation.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            
            // Extrair informações da rota
            const route = result.routes[0];
            if (route && route.legs && route.legs.length > 0) {
              const leg = route.legs[0];
              const distanceKm = leg.distance ? parseFloat((leg.distance.value / 1000).toFixed(1)) : 0;
              const durationMin = leg.duration ? Math.round(leg.duration.value / 60) : 0;
              
              if (onRouteCalculated) {
                onRouteCalculated({
                  distance: distanceKm,
                  duration: durationMin
                });
              }
            }
          } else {
            console.error('Erro ao calcular rota:', status);
            toast({
              title: 'Erro ao calcular rota',
              description: 'Não foi possível calcular a rota entre os pontos selecionados',
              variant: 'destructive',
            });
            setDirections(null);
          }
        }
      );
    }
  }, [isLoaded, locations, onRouteCalculated, toast]);
  
  const handleZoomIn = () => {
    if (map) {
      map.setZoom((map.getZoom() || zoom) + 1);
    }
  };
  
  const handleZoomOut = () => {
    if (map) {
      map.setZoom(Math.max((map.getZoom() || zoom) - 1, 1));
    }
  };
  
  const handleLocateMe = () => {
    getCurrentLocation();
  };
  
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);
  
  // Renderizar marcadores personalizados
  const renderMarkers = () => {
    // Não renderizar marcadores se estiver mostrando direções
    if (directions) return null;
    
    return locations.map((location, index) => (
      <Marker
        key={`marker-${index}`}
        position={{ lat: location.lat, lng: location.lng }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColors[location.type],
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          scale: 8,
        }}
        title={location.type === 'origin' ? 'Origem' : 
               location.type === 'destination' ? 'Destino' : 'Motorista'}
      />
    ));
  };
  
  // Renderizar o marcador da localização atual
  const renderCurrentLocationMarker = () => {
    if (!currentLocation || locations.some(loc => loc.type === 'origin')) return null;
    
    return (
      <Marker
        position={{ lat: currentLocation.lat, lng: currentLocation.lng }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: markerColors.origin,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          scale: 8,
        }}
        title="Sua localização atual"
      />
    );
  };
  
  if (loadError) {
    return (
      <Card className={`h-full rounded-lg shadow-lg overflow-hidden ${className}`}>
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-1">Erro ao carregar o mapa</h3>
            <p className="text-sm text-gray-600">Não foi possível carregar a API do Google Maps. Por favor, verifique sua conexão e tente novamente.</p>
          </div>
        </div>
      </Card>
    );
  }
  
  if (!isLoaded) {
    return (
      <Card className={`h-full rounded-lg shadow-lg overflow-hidden ${className}`}>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 font-medium">Carregando mapa...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={`h-full rounded-lg shadow-lg overflow-hidden ${className}`}>
      <div className="h-full relative">
        {/* Mapa do Google */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentLocation || defaultLocation}
          zoom={zoom}
          options={defaultOptions}
          onLoad={handleMapLoad}
        >
          {/* Renderizar marcadores */}
          {renderCurrentLocationMarker()}
          {renderMarkers()}
          
          {/* Renderizar direções */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#3B82F6',
                  strokeWeight: 4,
                  strokeOpacity: 0.7,
                },
              }}
            />
          )}
        </GoogleMap>
        
        {/* Controles de zoom */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 space-y-2 z-[1000]">
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-md"
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-8 h-8 rounded-md"
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Botão para localizar-me */}
        <div className="absolute bottom-4 right-4 z-[1000]">
          <Button 
            variant="default" 
            size="sm" 
            className="rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
            onClick={handleLocateMe}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LocateFixed className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Loading overlay */}
        {isLocating && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-[2000]">
            <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">Obtendo localização...</span>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {locationError && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-[2000]">
            <div className="bg-white p-4 rounded-lg shadow-lg max-w-xs">
              <div className="flex items-center space-x-2 text-destructive mb-2">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-semibold">Erro de localização</h4>
              </div>
              <p className="text-sm text-gray-600">{locationError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                onClick={() => setLocationError(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
