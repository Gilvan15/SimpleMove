import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { MapPin } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User } from '@shared/schema';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  user: User;
  onLanguageToggle: (language: string) => void;
}

export default function Header({ user, onLanguageToggle }: HeaderProps) {
  const { logoutMutation, updateUserLanguage } = useAuth();
  const [language, setLanguage] = useState(user.language === 'en');

  const handleLanguageToggle = () => {
    const newLanguage = language ? 'pt' : 'en';
    setLanguage(!language);
    updateUserLanguage(newLanguage);
    onLanguageToggle(newLanguage);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-md z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-primary flex items-center">
            <MapPin className="mr-2" />
            SimpleMove
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="inline-flex items-center cursor-pointer">
              <span className="mr-2 text-sm font-medium">PT</span>
              <Switch 
                id="language-toggle" 
                checked={language} 
                onCheckedChange={handleLanguageToggle} 
              />
              <span className="ml-2 text-sm font-medium">EN</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center text-sm focus:outline-none">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={user.profilePicture || ''} alt={user.fullName} />
                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="ml-2 font-medium hidden sm:inline-block">{user.fullName}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuItem>Histórico de corridas</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
