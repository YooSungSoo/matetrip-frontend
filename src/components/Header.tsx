import { Plus, Map, Home, User, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HeaderProps {
  activeTab: 'feed' | 'workspace' | 'profile';
  onTabChange: (tab: 'feed' | 'workspace' | 'profile') => void;
  onCreatePost: () => void;
}

export function Header({ activeTab, onTabChange, onCreatePost }: HeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl text-gray-900">TripTogether</span>
            </div>
            
            <nav className="hidden md:flex gap-1">
              <button
                onClick={() => onTabChange('feed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'feed' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4" />
                홈
              </button>
              <button
                onClick={() => onTabChange('workspace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'workspace' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Map className="w-4 h-4" />
                워크스페이스
              </button>
              <button
                onClick={() => onTabChange('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'profile' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4" />
                프로필
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                3
              </Badge>
            </button>
            
            <Button onClick={onCreatePost} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">여행 만들기</span>
            </Button>

            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
