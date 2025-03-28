import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PassengerView from '@/components/PassengerView';
import DriverView from '@/components/DriverView';
import MobileBottomSheet from '@/components/MobileBottomSheet';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Ride } from '@shared/schema';
import { useMobile } from '@/hooks/use-mobile';

export default function HomePage() {
  const { user, toggleUserOnlineStatus } = useAuth();
  const [activeView, setActiveView] = useState<'passenger' | 'driver'>('passenger');
  const { toast } = useToast();
  const isMobile = useMobile();
  
  const [mobileSheetContent, setMobileSheetContent] = useState<React.ReactNode | null>(null);

  const { data: activeRide, isLoading: rideLoading, error: rideError } = useQuery<Ride | null>({
    queryKey: ['/api/rides/active'],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, { credentials: 'include' });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Failed to fetch active ride');
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });

  const cancelRideMutation = useMutation({
    mutationFn: async (rideId: number) => {
      const res = await apiRequest('PATCH', `/api/rides/${rideId}/cancel`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rides/active'] });
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

  useEffect(() => {
    // If user is a driver, default to driver view
    if (user?.userType === 'driver') {
      setActiveView('driver');
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        user={user}
        onLanguageToggle={(language) => {
          // Update language happens in the Header component using useAuth
        }}
      />
      
      <div className="container mx-auto flex-1 flex flex-col">
        <div className="py-4 px-4">
          <div className="flex border-b border-gray-200">
            <button
              className={`px-4 py-2 font-medium ${
                activeView === 'passenger'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-primary'
              }`}
              onClick={() => setActiveView('passenger')}
              disabled={user.userType === 'driver'}
            >
              Passageiro
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeView === 'driver'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-primary'
              }`}
              onClick={() => setActiveView('driver')}
            >
              Motorista
            </button>
          </div>
        </div>
        
        {activeView === 'passenger' && (
          <PassengerView 
            user={user} 
            activeRide={activeRide} 
            onCancelRide={(rideId) => cancelRideMutation.mutate(rideId)} 
            isCancelling={cancelRideMutation.isPending}
            setMobileSheetContent={setMobileSheetContent}
          />
        )}
        
        {activeView === 'driver' && (
          <DriverView 
            user={user} 
            activeRide={activeRide}
            onToggleOnline={toggleUserOnlineStatus}
            setMobileSheetContent={setMobileSheetContent}
          />
        )}
      </div>
      
      {isMobile && (
        <MobileBottomSheet>
          {mobileSheetContent}
        </MobileBottomSheet>
      )}
      
      <Footer />
    </div>
  );
}
