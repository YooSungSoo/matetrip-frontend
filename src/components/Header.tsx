import { useEffect, useState } from 'react';
import { Map, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuthStore } from '../store/authStore';
import { NotificationPanel } from './NotificationPanel'; // new-ui의 컴포넌트 사용
import { SearchBar } from './SearchBar'; // new-ui의 컴포넌트 사용
import client from '../api/client';

interface HeaderProps {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onProfileClick: () => void;
  onLogoClick: () => void;
  onSearch?: (query: string) => void; // onSearch prop 추가
}

export function Header({
  isLoggedIn,
  isAuthLoading,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onLogoClick,
  onSearch,
}: HeaderProps) {
  const { user } = useAuthStore();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileImage = async () => {
      if (!user?.profile?.profileImageId) {
        setProfileImageUrl(null);
        return;
      }
      try {
        const response = await client.get<{ url: string }>(
          `/binary-content/${user.profile.profileImageId}/presigned-url`
        );
        if (isMounted) {
          setProfileImageUrl(response.data.url);
        }
      } catch (error) {
        console.error('헤더 프로필 이미지 로드 실패:', error);
        if (isMounted) {
          setProfileImageUrl(null);
        }
      }
    };

    fetchProfileImage();

    return () => {
      isMounted = false;
    };
  }, [user?.profile?.profileImageId]);

  return (
    <header className="w-full border-b bg-white shadow-sm sticky top-0 z-50 h-18">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <button
            onClick={onLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Map className="logo w-5 h-5 text-white" />
            </div>
            <span className="text-xl text-gray-900 hidden sm:inline">
              MateTrip
            </span>
          </button>

          {/* 중앙: 검색창 */}
          <div className="flex-1 max-w-2xl">
            <SearchBar onSearch={onSearch} />
          </div>

          {/* 오른쪽: 알림 + 프로필 */}
          <div className="flex items-center gap-4">
            {isAuthLoading ? (
              // 로딩 중일 때 보여줄 스켈레톤 UI
              <div className="flex items-center gap-4 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="h-9 w-24 rounded-md bg-gray-200"></div>
              </div>
            ) : isLoggedIn ? (
              <>
                <NotificationPanel />

                <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

                <button
                  onClick={onProfileClick}
                  className="w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <img
                    src={
                      profileImageUrl ||
                      `https://ui-avatars.com/api/?name=${user?.profile?.nickname}&background=random`
                    }
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="flex items-center gap-2">
                  {user && (
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {user.profile.nickname}님
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogoutClick}
                  className="gap-2"
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
