import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMobile } from '@/hooks/use-mobile';
import { playRideRequestSound } from '@/lib/sounds';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, PhoneCall, Car, MapPin, Flag } from 'lucide-react';
import Map from '@/components/Map';
import { User, Ride, Vehicle } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DriverViewProps {
  user: User;
  activeRide: Ride | null | undefined;
  onToggleOnline: () => void;
  setMobileSheetContent: (content: React.ReactNode) => void;
}

export default function DriverView({ 
  user, 
  activeRide,
  onToggleOnline,
  setMobileSheetContent
}: DriverViewProps) {
  const [rideRequest, setRideRequest] = useState<Ride | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [countdownActive, setCountdownActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [rideState, setRideState] = useState<
    'no-rides' | 'request' | 'active-picking-up' | 'active-in-progress'
  >(activeRide ? (
    activeRide.status === 'accepted' ? 'active-picking-up' :
    activeRide.status === 'in_progress' ? 'active-in-progress' : 'no-rides'
  ) : 'no-rides');
  
  const { toast } = useToast();
  const isMobile = useMobile();

  // Query to get driver stats
  const { data: driverStats } = useQuery({
    queryKey: ['/api/drivers/stats'],
    queryFn: async () => {
      // Simulated data for the MVP
      return {
        todayRides: 14,
        todayEarnings: 280,
        rating: 4.9,
        timeOnline: '6h 24min'
      };
    }
  });

  // Query to get driver's vehicle
  const { data: driverVehicle } = useQuery<Vehicle>({
    queryKey: ['/api/drivers/vehicle'],
    queryFn: async () => {
      // Simulated data for the MVP
      return {
        id: 1,
        driverId: user.id,
        model: 'Honda Civic',
        year: '2020',
        color: 'Preto',
        licensePlate: 'ABC-1234',
        vehicleType: 'economy'
      };
    }
  });

  // Query to get recent rides
  const { data: recentRides } = useQuery({
    queryKey: ['/api/drivers/rides/recent'],
    queryFn: async () => {
      // Simulated data for the MVP
      return [
        {
          id: 101,
          origin: 'Rua Augusta',
          destination: 'Shopping Ibirapuera',
          timestamp: new Date(),
          price: 24.30,
          distance: 7.2,
          duration: 22
        },
        {
          id: 102,
          origin: 'Estação Sé',
          destination: 'Aeroporto Congonhas',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          price: 52.80,
          distance: 12.6,
          duration: 35
        }
      ];
    },
    enabled: rideState === 'no-rides'
  });

  // Mutations for ride actions
  const acceptRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/accept`, {});
      return await res.json();
    },
    onSuccess: (ride: Ride) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
      setRideState('active-picking-up');
      toast({
        title: 'Corrida aceita',
        description: 'Você aceitou a corrida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao aceitar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const declineRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/decline`, {});
      return await res.json();
    },
    onSuccess: () => {
      setRideRequest(null);
      setRideState('no-rides');
      toast({
        title: 'Corrida recusada',
        description: 'Você recusou a corrida.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao recusar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const arrivedMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/arrived`, {});
      return await res.json();
    },
    onSuccess: () => {
      // Just show a message but don't change state yet
      toast({
        title: 'Chegada confirmada',
        description: 'Você chegou ao local de embarque.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao confirmar chegada',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const startRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/start`, {});
      return await res.json();
    },
    onSuccess: () => {
      setRideState('active-in-progress');
      toast({
        title: 'Corrida iniciada',
        description: 'A corrida foi iniciada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao iniciar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const completeRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/complete`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
      setRideState('no-rides');
      toast({
        title: 'Corrida finalizada',
        description: 'A corrida foi finalizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao finalizar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/cancel`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
      setRideState('no-rides');
      toast({
        title: 'Corrida cancelada',
        description: 'A corrida foi cancelada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar corrida',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // For demo purposes, simulate receiving a ride request
  useEffect(() => {
    // Only show the demo if we're online and don't have a current ride
    if (user.isOnline && rideState === 'no-rides' && !activeRide && !rideRequest) {
      const timer = setTimeout(() => {
        // Simulate a ride request
        setRideRequest({
          id: 999,
          passengerId: 2,
          driverId: user.id,
          originAddress: 'Av. Paulista, 1000, São Paulo',
          destinationAddress: 'Rua Augusta, 500, São Paulo',
          originLat: -23.5505,
          originLng: -46.6333,
          destinationLat: -23.5605,
          destinationLng: -46.6433,
          status: 'requested',
          requestedAt: new Date(),
          distance: 4.5,
          duration: 12,
          fare: 18.5,
          vehicleType: 'economy'
        } as Ride);
        
        setRideState('request');
        setCountdown(15);
        setCountdownActive(true);
        
        // Tocar som de alerta para o motorista
        playRideRequestSound();
        
        toast({
          title: 'Nova solicitação de corrida',
          description: 'Você recebeu uma nova solicitação de corrida!'
        });
      }, 10000); // Show demo ride request after 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [user.isOnline, rideState, activeRide, rideRequest]);
  
  // Countdown timer for ride requests
  useEffect(() => {
    if (countdownActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdownActive && countdown <= 0) {
      // Auto-decline when countdown reaches zero
      setCountdownActive(false);
      if (rideRequest) {
        declineRideMutation.mutate(rideRequest.id);
      }
    }
  }, [countdown, countdownActive, rideRequest]);

  // Update mobile sheet content
  useEffect(() => {
    if (isMobile) {
      setMobileSheetContent(renderDriverPanel());
    }
  }, [
    isMobile, 
    rideState, 
    user, 
    driverStats, 
    driverVehicle, 
    rideRequest, 
    countdown, 
    recentRides,
    activeRide
  ]);

  // Helper function to format time and currency
  const formatCurrency = (value: number | null | undefined) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Render driver panel based on state
  const renderDriverPanel = useCallback(() => {
    switch (rideState) {
      case 'no-rides':
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              {/* Driver Status Panel */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Modo Motorista</h2>
                  <div className="flex items-center">
                    <Switch 
                      id="driver-status" 
                      checked={user.isOnline || false}
                      onCheckedChange={onToggleOnline}
                    />
                    <span className={`ml-2 text-sm font-medium ${user.isOnline ? 'text-secondary' : 'text-gray-500'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold">{driverStats?.todayRides || 0}</div>
                      <div className="text-xs text-gray-600">Corridas hoje</div>
                    </div>
                    <div className="text-center border-l border-r border-gray-200">
                      <div className="text-xl font-bold">R$ {driverStats?.todayEarnings || 0}</div>
                      <div className="text-xs text-gray-600">Ganhos hoje</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">{driverStats?.rating || 0}</div>
                      <div className="text-xs text-gray-600">Avaliação</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tempo online:</span>
                    <span className="font-medium">{driverStats?.timeOnline || '0min'}</span>
                  </div>
                </div>
                
                {/* Vehicle Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Seu veículo</h3>
                    <Button variant="link" className="p-0 h-auto text-primary text-sm">
                      Alterar
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <Car className="text-gray-600 mr-3 h-5 w-5" />
                    <div>
                      <div className="font-medium">{driverVehicle?.model} {driverVehicle?.color}</div>
                      <div className="text-sm text-gray-600">{driverVehicle?.licensePlate} • {driverVehicle?.year}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent rides */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-medium mb-4">Histórico de corridas</h3>
                
                {recentRides?.map((ride) => (
                  <div key={ride.id} className="border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{ride.origin} → {ride.destination}</div>
                        <div className="text-sm text-gray-600">
                          Hoje, {formatDate(ride.timestamp)}
                        </div>
                      </div>
                      <div className="font-bold">{formatCurrency(ride.price)}</div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <i className="fas fa-route mr-1"></i>
                      <span>{ride.distance} km</span>
                      <span className="mx-2">•</span>
                      <i className="fas fa-clock mr-1"></i>
                      <span>{ride.duration} min</span>
                    </div>
                  </div>
                ))}
                
                <Button variant="link" className="w-full text-primary text-center py-3 mt-4">
                  Ver histórico completo
                </Button>
              </div>
            </div>
          </ScrollArea>
        );
      
      case 'request':
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              <div className="bg-primary/10 rounded-lg p-4 border-l-4 border-primary animate-pulse mb-6">
                <h3 className="font-bold text-lg mb-2">Nova solicitação de corrida!</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <MapPin className="text-primary mt-1 mr-3 h-5 w-5" />
                    <div>
                      <div className="text-sm text-gray-600">Origem:</div>
                      <div className="font-medium">{rideRequest?.originAddress}</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Flag className="text-accent mt-1 mr-3 h-5 w-5" />
                    <div>
                      <div className="text-sm text-gray-600">Destino:</div>
                      <div className="font-medium">{rideRequest?.destinationAddress}</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Distância</div>
                    <div className="font-bold">{rideRequest?.distance} km</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tempo</div>
                    <div className="font-bold">{rideRequest?.duration} min</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Valor</div>
                    <div className="font-bold">{formatCurrency(rideRequest?.fare || 0)}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80" alt="Passenger Avatar" />
                      <AvatarFallback>MS</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Maria Silva</div>
                      <div className="flex items-center text-sm">
                        <div className="flex items-center text-amber-500 mr-1">
                          <i className="fas fa-star text-xs mr-1"></i>
                          <span>4.7</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-600">
                    <div id="request-countdown" className="font-bold text-xl">{countdown}</div>
                    <div className="text-xs">segundos</div>
                  </div>
                </div>
                
                <div className="flex space-x-2 mt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => rideRequest && declineRideMutation.mutate(rideRequest.id)}
                    disabled={declineRideMutation.isPending}
                  >
                    Recusar
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={() => rideRequest && acceptRideMutation.mutate(rideRequest.id)}
                    disabled={acceptRideMutation.isPending}
                  >
                    Aceitar
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        );
      
      case 'active-picking-up':
      case 'active-in-progress':
        const ride = activeRide || rideRequest;
        if (!ride) return null;
        
        const isPickingUp = rideState === 'active-picking-up';
        
        return (
          <ScrollArea className="h-full">
            <div className="py-4">
              <div className="bg-secondary/10 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-secondary">Corrida em andamento</h3>
                  <Badge className="bg-secondary">
                    {isPickingUp ? 'Indo buscar passageiro' : 'Passageiro a bordo'}
                  </Badge>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-start">
                    <MapPin className="text-primary mt-1 mr-3 h-5 w-5" />
                    <div>
                      <div className="text-sm text-gray-600">Origem:</div>
                      <div className="font-medium">{ride.originAddress}</div>
                      {isPickingUp && <div className="text-sm text-gray-600 mt-1">Chegada em 3 min</div>}
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Flag className="text-accent mt-1 mr-3 h-5 w-5" />
                    <div>
                      <div className="text-sm text-gray-600">Destino:</div>
                      <div className="font-medium">{ride.destinationAddress}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80" alt="Passenger Avatar" />
                      <AvatarFallback>MS</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">Maria Silva</div>
                      <div className="flex items-center text-sm">
                        <div className="flex items-center text-amber-500 mr-1">
                          <i className="fas fa-star text-xs mr-1"></i>
                          <span>4.7</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
                      <PhoneCall className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Ações da corrida</h3>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Valor da corrida</div>
                    <div className="font-bold text-lg">{formatCurrency(ride.fare || 0)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {isPickingUp && (
                    <Button 
                      className="w-full bg-secondary hover:bg-secondary/90" 
                      onClick={() => arrivedMutation.mutate(ride.id)}
                      disabled={arrivedMutation.isPending}
                    >
                      Cheguei ao local de embarque
                    </Button>
                  )}
                  
                  {isPickingUp && arrivedMutation.isSuccess && (
                    <Button 
                      className="w-full" 
                      onClick={() => startRideMutation.mutate(ride.id)}
                      disabled={startRideMutation.isPending}
                    >
                      Iniciar corrida
                    </Button>
                  )}
                  
                  {!isPickingUp && (
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90" 
                      onClick={() => completeRideMutation.mutate(ride.id)}
                      disabled={completeRideMutation.isPending}
                    >
                      Finalizar corrida
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive border-destructive hover:bg-destructive/10" 
                    onClick={() => cancelRideMutation.mutate(ride.id)}
                    disabled={cancelRideMutation.isPending}
                  >
                    Cancelar corrida
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        );
      
      default:
        return null;
    }
  }, [
    rideState,
    user,
    driverStats,
    driverVehicle,
    rideRequest,
    countdown,
    recentRides,
    activeRide,
    acceptRideMutation.isPending,
    declineRideMutation.isPending,
    arrivedMutation.isPending,
    arrivedMutation.isSuccess,
    startRideMutation.isPending,
    completeRideMutation.isPending,
    cancelRideMutation.isPending,
    onToggleOnline
  ]);

  return (
    <div id="driver-view" className="flex flex-col md:flex-row flex-1 relative">
      {/* Right panel - Map for desktop */}
      <div className="md:w-2/3 order-1 md:order-2 h-[300px] md:h-auto relative z-10">
        <Map 
          locations={[
            ...(rideState !== 'no-rides' && rideRequest 
              ? [
                  { lat: -23.5505, lng: -46.6333, type: 'origin' as const },
                  { lat: -23.5605, lng: -46.6433, type: 'destination' as const },
                  { lat: currentLocation ? currentLocation.lat : -23.5305, 
                    lng: currentLocation ? currentLocation.lng : -46.6233, 
                    type: 'driver' as const }
                ] 
              : currentLocation 
                ? [{ lat: currentLocation.lat, lng: currentLocation.lng, type: 'driver' as const }]
                : [{ lat: -23.5305, lng: -46.6233, type: 'driver' as const }])
          ]}
          className="relative z-0"
          onLocationUpdate={(location) => {
            setCurrentLocation(location);
          }}
        />
      </div>
      
      {/* Left panel - Driver status and rides for desktop */}
      <div className="md:w-1/3 md:pr-4 order-2 md:order-1 driver-panel h-0 md:h-auto md:min-h-[calc(100vh-200px)] relative z-20">
        <Card className="hidden md:block h-full">
          <CardContent className="p-5 h-full overflow-y-auto">
            {renderDriverPanel()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
