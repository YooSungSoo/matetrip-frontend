import { Bell, Map, Plus, User, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface HeaderProps {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: () => void;
  onCreatePost: () => void;
  onLogoClick: () => void;
}

export function Header({
  isLoggedIn,
  isAuthLoading,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onCreatePost,
  onLogoClick,
}: HeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Map className="logo w-5 h-5 text-white" />
            </div>
            <span className="text-xl text-gray-900">TripTogether</span>
          </button>

          <div className="flex items-center gap-3">
            {isAuthLoading ? (
              // 로딩 중일 때 보여줄 스켈레톤 UI
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="h-9 w-24 rounded-md bg-gray-200"></div>
              </div>
            ) : isLoggedIn ? (
              <>
                <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    3
                  </Badge>
                </button>

                <Button
                  onClick={onCreatePost}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">게시물 작성</span>
                </Button>

                <button
                  onClick={onProfileClick}
                  className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
                </button>

                <Button
                  variant="ghost"
                  onClick={onLogoutClick}
                  className="gap-2 text-gray-600"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={onLoginClick}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <LogIn className="w-4 h-4" />
                로그인
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
