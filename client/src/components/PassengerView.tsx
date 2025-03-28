import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { 
  Card, 
  CardContent, 
  CardTitle, 
  CardHeader, 
  CardFooter 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarIcon, MessageCircle, PhoneCall, X, CreditCard } from 'lucide-react';
import Map from '@/components/Map';
import { User, Ride } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import GooglePlacesInput from '@/components/GooglePlacesInput';

interface PassengerViewProps {
  user: User;
  activeRide: Ride | null | undefined;
  onCancelRide: (rideId: number) => void;
  isCancelling: boolean;
  setMobileSheetContent: (content: React.ReactNode) => void;
}

export default function PassengerView({ 
  user, 
  activeRide, 
  onCancelRide, 
  isCancelling,
  setMobileSheetContent
}: PassengerViewProps) {
  const [rideState, setRideState] = useState<
    'request' | 'searching' | 'driver-found' | 'in-progress' | 'rate'
  >(activeRide ? (
    activeRide.status === 'requested' ? 'searching' :
    activeRide.status === 'accepted' ? 'driver-found' :
    activeRide.status === 'in_progress' ? 'in-progress' : 'request'
  ) : 'request');
  
  const [pickupLocation, setPickupLocation] = useState('Minha localização atual');
  const [pickupInput, setPickupInput] = useState('');
  const [pickupAddressSearch, setPickupAddressSearch] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{lat: number; lng: number} | null>(null);
  const [destination, setDestination] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationAddressSearch, setDestinationAddressSearch] = useState<boolean>(false);
  const [destinationCoords, setDestinationCoords] = useState<{lat: number; lng: number} | null>(null);
  const [vehicleType, setVehicleType] = useState('economy');
  
  const [rideEstimate, setRideEstimate] = useState<{
    distance: number;
    duration: number;
    price: number;
  }>({ distance: 0, duration: 0, price: 0 });

  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  
  const { toast } = useToast();
  const isMobile = useMobile();
  
  // Função para obter a localização atual do usuário
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: 'Erro de localização',
        description: 'Geolocalização não é suportada pelo seu navegador',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Obtendo localização',
      description: 'Atualizando sua localização atual...',
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(newLocation);
        setPickupLocation('Minha localização atual');
        
        toast({
          title: 'Localização atualizada',
          description: 'Sua localização atual foi obtida com sucesso',
        });
      },
      (error) => {
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
  }, [toast]);

  // Fetch nearby drivers - this would be real in production
  const { data: nearbyDrivers } = useQuery({
    queryKey: ['/api/drivers/nearby'],
    queryFn: async () => {
      // Simulated data for the MVP
      return [
        {
          id: 1,
          fullName: 'Carlos Oliveira',
          rating: 4.8,
          totalRides: 3254,
          vehicle: {
            model: 'Honda Civic',
            color: 'Preto',
            licensePlate: 'ABC-1234'
          },
          distanceMinutes: 3
        }
      ];
    },
    enabled: rideState === 'driver-found'
  });

  const driver = nearbyDrivers?.[0]; // For the MVP, we'll use the first driver
  
  const requestRideMutation = useMutation({
    mutationFn: async (rideData: { 
      originAddress: string; 
      destinationAddress: string;
      vehicleType: string;
    }) => {
      const res = await apiRequest('POST', '/api/rides', rideData);
      return await res.json();
    },
    onSuccess: (ride: Ride) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
      setRideState('searching');
      toast({
        title: 'Solicitation enviada',
        description: 'Buscando motoristas disponíveis próximos à sua localização',
      });
      
      // For the MVP, simulate finding a driver after a delay
      setTimeout(() => {
        setRideState('driver-found');
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao solicitar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const submitRatingMutation = useMutation({
    mutationFn: async (ratingData: { 
      rideId: number; 
      rating: number;
      comment: string;
    }) => {
      const res = await apiRequest('POST', '/api/ratings', ratingData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
      setRideState('request');
      setRating(0);
      setRatingComment('');
      toast({
        title: 'Avaliação enviada',
        description: 'Obrigado por avaliar sua viagem!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update mobile content when ride state changes
  useEffect(() => {
    if (isMobile) {
      setMobileSheetContent(renderPassengerPanel());
    }
  }, [rideState, isMobile, destination, vehicleType, rating, ratingComment, activeRide]);

  // Função para calcular o preço estimado com base na distância e tipo de veículo
  const calculatePrice = useCallback((distance: number, vehicleType: string) => {
    let basePrice = 10;
    
    // Add distance factor
    basePrice += distance * 2;
    
    // Vehicle type multiplier
    const multipliers = {
      economy: 1,
      comfort: 1.5,
      premium: 2
    };
    
    // Apply multiplier based on vehicle type
    const multiplier = multipliers[vehicleType as keyof typeof multipliers] || 1;
    const price = basePrice * multiplier;
    
    return Math.round(price * 10) / 10; // Round to 1 decimal place
  }, []);
  
  // Função de callback para receber informações da rota calculada
  const handleRouteCalculated = useCallback((routeInfo: { distance: number; duration: number }) => {
    const { distance, duration } = routeInfo;
    const price = calculatePrice(distance, vehicleType);
    
    setRideEstimate({
      distance,
      duration,
      price
    });
    
    // Podemos adicionar um toast para informar o usuário
    toast({
      title: 'Rota calculada',
      description: `Distância: ${distance} km, tempo estimado: ${duration} min`,
    });
  }, [vehicleType, calculatePrice, toast]);
  
  // Recalcular preço quando o tipo de veículo mudar
  useEffect(() => {
    if (rideEstimate.distance > 0) {
      const price = calculatePrice(rideEstimate.distance, vehicleType);
      setRideEstimate(prev => ({ ...prev, price }));
    }
  }, [vehicleType, calculatePrice, rideEstimate.distance]);

  const handleRequestRide = () => {
    if (!destination) {
      toast({
        title: 'Informe o destino',
        description: 'Por favor, preencha o campo de destino antes de solicitar uma corrida.',
        variant: 'destructive',
      });
      return;
    }
    
    requestRideMutation.mutate({
      originAddress: pickupLocation,
      destinationAddress: destination,
      vehicleType
    });
  };
  
  const handleCancelSearch = () => {
    if (activeRide) {
      onCancelRide(activeRide.id);
    } else {
      setRideState('request');
    }
  };
  
  const handleSubmitRating = () => {
    if (!activeRide) {
      setRideState('request');
      return;
    }
    
    if (rating === 0) {
      toast({
        title: 'Selecione uma avaliação',
        description: 'Por favor, selecione uma avaliação de 1 a 5 estrelas.',
        variant: 'destructive',
      });
      return;
    }
    
    submitRatingMutation.mutate({
      rideId: activeRide.id,
      rating,
      comment: ratingComment
    });
  };
  
  const handleSkipRating = () => {
    setRideState('request');
  };
  
  // Handle user location update from Map component
  const handleLocationUpdate = useCallback((coords: { lat: number; lng: number }) => {
    setUserCoords(coords);
    // Aqui você poderia fazer uma chamada a uma API de geocodificação reversa
    // para obter o endereço a partir das coordenadas, mas para o MVP vamos manter simples
    setPickupLocation('Minha localização atual');
    
    // Não mostramos toast aqui para evitar notificações duplicadas
    // O Map component já mostra um toast quando atualiza a localização
    // É isso que estava causando múltiplas notificações no loop
  }, []);
  
  // Manipuladores para seleção de endereços sugeridos
  const handlePickupAddressSelect = useCallback((address: string, lat: number, lng: number) => {
    setPickupLocation(address);
    setUserCoords({ lat, lng });
    setPickupInput('');
  }, []);
  
  const handleDestinationAddressSelect = useCallback((address: string, lat: number, lng: number) => {
    setDestination(address);
    setDestinationCoords({ lat, lng });
    setDestinationInput('');
  }, []);

  // Helper function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Component to render ride type options
  const RideTypeOption = ({ type, label, description, icon }: { 
    type: string; 
    label: string; 
    description: string; 
    icon: string;
  }) => {
    return (
      <div 
        className={`ride-type-option border rounded-lg p-3 text-center cursor-pointer hover:border-primary transition-colors duration-200 ${
          vehicleType === type ? 'border-primary bg-primary/5' : 'border-gray-200'
        }`}
        onClick={() => setVehicleType(type)}
      >
        <i className={`${icon} text-2xl mb-2`}></i>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    );
  };

  // Star rating component
  const StarRating = () => {
    return (
      <div className="flex justify-center space-x-2 text-3xl mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-${rating >= star ? 'amber-500' : 'gray-300'} hover:text-amber-500 focus:text-amber-500 transition-colors duration-150`}
            onClick={() => setRating(star)}
          >
            <StarIcon className="h-8 w-8" />
          </button>
        ))}
      </div>
    );
  };

  // Render the passenger panel based on current state
  const renderPassengerPanel = useCallback(() => {
    switch (rideState) {
      case 'request':
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              <h2 className="text-xl font-semibold mb-6">Solicitar corrida</h2>
              
              {/* Location Form */}
              <div className="space-y-4 mb-6">
                <div className="relative mb-12">
                  <GooglePlacesInput
                    value={pickupInput}
                    onChange={setPickupInput}
                    onSelect={handlePickupAddressSelect}
                    placeholder="Digite o endereço de partida"
                    label={<Label htmlFor="pickup-location" className="block text-sm font-medium text-gray-700 mb-1">Local de partida</Label>}
                    icon={<div className="h-4 w-4 rounded-full bg-primary"></div>}
                  />
                </div>
                
                <div className="relative">
                  <GooglePlacesInput
                    value={destinationInput}
                    onChange={setDestinationInput}
                    onSelect={handleDestinationAddressSelect}
                    placeholder="Para onde vamos?"
                    label={<Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">Destino</Label>}
                    icon={<div className="h-4 w-4 rounded-full bg-accent"></div>}
                  />
                </div>
              </div>

              {/* Ride options */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">Tipo de veículo</h3>
                <div className="grid grid-cols-3 gap-2">
                  <RideTypeOption 
                    type="economy" 
                    label="Econômico" 
                    description="Menor preço" 
                    icon="fas fa-car" 
                  />
                  <RideTypeOption 
                    type="comfort" 
                    label="Conforto" 
                    description="Mais espaço" 
                    icon="fas fa-car-side" 
                  />
                  <RideTypeOption 
                    type="premium" 
                    label="Premium" 
                    description="Luxo" 
                    icon="fas fa-car-alt" 
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-medium">Forma de pagamento</h3>
                  <Button variant="link" className="text-primary p-0 h-auto text-sm font-medium">
                    Alterar
                  </Button>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 flex items-center">
                  <CreditCard className="text-gray-600 mr-3" />
                  <div>
                    <div className="text-sm font-medium">Mastercard •••• 4589</div>
                    <div className="text-xs text-gray-500">Expira em 12/25</div>
                  </div>
                </div>
              </div>

              {/* Price estimate and request button */}
              {destination && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium">Preço estimado:</span>
                    <span className="text-lg font-bold">{formatCurrency(rideEstimate.price)}</span>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleRequestRide}
                    disabled={requestRideMutation.isPending || !destination}
                  >
                    Solicitar SimpleMove
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        );
      
      case 'searching':
        return (
          <div className="h-full flex flex-col justify-center items-center text-center py-10">
            <div className="pulse w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <i className="fas fa-car-side text-primary text-4xl"></i>
            </div>
            <h2 className="text-xl font-semibold mb-2">Buscando motoristas</h2>
            <p className="text-gray-600 mb-6">Procurando o motorista mais próximo de você...</p>
            <Button variant="link" onClick={handleCancelSearch} disabled={isCancelling}>
              Cancelar busca
            </Button>
          </div>
        );
      
      case 'driver-found':
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              <div className="bg-background rounded-lg p-4 mb-6">
                <div className="flex items-center mb-4">
                  <Avatar className="h-12 w-12 mr-4">
                    <AvatarImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e" alt="Driver Avatar" />
                    <AvatarFallback>CO</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{driver?.fullName || 'Carlos Oliveira'}</h3>
                    <div className="flex items-center text-sm">
                      <div className="flex items-center text-amber-500 mr-2">
                        <StarIcon className="h-3 w-3 mr-1" />
                        <span>{driver?.rating || 4.8}</span>
                      </div>
                      <span className="text-gray-600">• {driver?.totalRides || 3254} corridas</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <i className="fas fa-car text-gray-600 mr-2"></i>
                    <div>
                      <div className="text-sm font-medium">{driver?.vehicle.model || 'Honda Civic'} {driver?.vehicle.color || 'Preto'}</div>
                      <div className="text-xs text-gray-600">{driver?.vehicle.licensePlate || 'ABC-1234'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Chegada em</div>
                    <div className="text-lg font-bold text-primary">{driver?.distanceMinutes || 3} min</div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" className="text-primary">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Mensagem
                  </Button>
                  <Button variant="outline" className="text-primary">
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Ligar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => activeRide && onCancelRide(activeRide.id)}
                    disabled={isCancelling}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium mb-3">Detalhes da corrida</h3>
                <div className="space-y-3">
                  <div className="flex">
                    <div className="mr-3 mt-1">
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <div className="font-medium">Origem</div>
                      <div className="text-sm text-gray-600">{activeRide?.originAddress || pickupLocation}</div>
                    </div>
                  </div>
                  <div className="flex">
                    <div className="mr-3 mt-1">
                      <div className="h-3 w-3 rounded-full bg-accent"></div>
                    </div>
                    <div>
                      <div className="font-medium">Destino</div>
                      <div className="text-sm text-gray-600">{activeRide?.destinationAddress || destination}</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tempo estimado:</span>
                    <span className="font-medium">{rideEstimate.duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distância:</span>
                    <span className="font-medium">{rideEstimate.distance} km</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold mt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(rideEstimate.price)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        );
      
      case 'in-progress':
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              <div className="bg-secondary/10 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-secondary">Viagem em andamento</h3>
                  <Badge className="bg-secondary">A caminho</Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <i className="fas fa-clock text-gray-600 mr-2"></i>
                    <div>
                      <div className="text-sm">Tempo estimado de chegada:</div>
                      <div className="font-bold">14:35</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-map-marker-alt text-gray-600 mr-2"></i>
                    <div>
                      <div className="text-sm">Destino:</div>
                      <div className="font-bold">{activeRide?.destinationAddress || destination}</div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e" alt="Driver Avatar" />
                      <AvatarFallback>CO</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{driver?.fullName || 'Carlos Oliveira'}</div>
                      <div className="text-sm text-gray-600">{driver?.vehicle.model || 'Honda Civic'} • {driver?.vehicle.licensePlate || 'ABC-1234'}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="icon" variant="outline" className="rounded-full">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full">
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="font-medium mb-4">Compartilhar viagem</h3>
                <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 mb-4">
                  <div className="text-sm truncate w-3/4">
                    https://simplemove.com/trip/share/{activeRide?.id || 'abc123'}
                  </div>
                  <Button size="sm">
                    Copiar
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90">
                    <i className="fab fa-whatsapp mr-2"></i>
                    WhatsApp
                  </Button>
                  <Button className="flex-1 bg-[#3b5998] hover:bg-[#3b5998]/90">
                    <i className="fab fa-facebook-messenger mr-2"></i>
                    Messenger
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        );
      
      case 'rate':
        return (
          <div className="text-center py-6">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e" alt="Driver Avatar" />
              <AvatarFallback>CO</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold mb-2">Como foi sua viagem com Carlos?</h2>
            <p className="text-gray-600 mb-4">Sua avaliação ajuda a melhorar a experiência SimpleMove</p>
            
            <StarRating />
            
            <div className="mb-6">
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-primary focus:border-primary" 
                rows={3} 
                placeholder="Adicione um comentário (opcional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={handleSubmitRating}
                disabled={submitRatingMutation.isPending}
              >
                Enviar avaliação
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSkipRating}
                disabled={submitRatingMutation.isPending}
              >
                Pular
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  }, [
    rideState, 
    pickupLocation, 
    destination, 
    vehicleType, 
    rideEstimate, 
    driver, 
    rating, 
    ratingComment, 
    activeRide,
    requestRideMutation.isPending,
    submitRatingMutation.isPending,
    isCancelling,
    pickupAddressSearch,
    destinationAddressSearch,
    handlePickupAddressSelect,
    handleDestinationAddressSelect
  ]);

  return (
    <div id="passenger-view" className="flex flex-col md:flex-row flex-1 relative">
      {/* Right panel - Map for desktop */}
      <div className="md:w-2/3 order-1 md:order-2 h-[300px] md:h-auto relative z-10">
        <Map 
          locations={[
            // Usar coordenadas do usuário se disponíveis, caso contrário usar um padrão
            { 
              lat: userCoords?.lat || -23.5505, 
              lng: userCoords?.lng || -46.6333, 
              type: 'origin' as const 
            },
            ...(destination && destinationCoords ? [{ 
              lat: destinationCoords.lat, 
              lng: destinationCoords.lng, 
              type: 'destination' as const 
            }] : destination ? [{ 
              lat: userCoords ? userCoords.lat + 0.01 : -23.5605, 
              lng: userCoords ? userCoords.lng + 0.01 : -46.6433, 
              type: 'destination' as const 
            }] : []),
            ...(rideState === 'driver-found' || rideState === 'in-progress' 
              ? [{ 
                  lat: userCoords ? userCoords.lat - 0.005 : -23.5405, 
                  lng: userCoords ? userCoords.lng - 0.005 : -46.6233, 
                  type: 'driver' as const 
                }] 
              : [])
          ]}
          onLocationUpdate={handleLocationUpdate}
          onRouteCalculated={handleRouteCalculated}
          className="relative z-0"
        />
      </div>
      
      {/* Left panel - Request ride form for desktop */}
      <div className="md:w-1/3 md:pr-4 order-2 md:order-1 passenger-panel h-0 md:h-auto md:min-h-[calc(100vh-200px)] relative z-20">
        <Card className="hidden md:block h-full">
          <CardContent className="p-5 h-full overflow-y-auto">
            {renderPassengerPanel()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
