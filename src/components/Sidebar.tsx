import {
  Map,
  FileText,
  Plane,
  LogIn,
  Heart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuthStore } from '../store/authStore';
import { NotificationPanel } from './NotificationPanel';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import client from '../api/client';

interface SidebarProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onProfileClick: () => void;
  onCreatePost: () => void;
  onAIChatClick: () => void;
}

export function Sidebar({
  isLoggedIn,
  onLoginClick,
  onProfileClick,
}: SidebarProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfileImage = async () => {
      const imageId = user?.profile?.profileImageId;
      if (!imageId) {
        setProfileImageUrl(null);
        return;
      }

      try {
        const { data } = await client.get<{ url: string }>(
          `/binary-content/${imageId}/presigned-url`
        );
        if (!cancelled) {
          setProfileImageUrl(data.url);
        }
      } catch (error) {
        console.error('Sidebar profile image load failed:', error);
        if (!cancelled) {
          setProfileImageUrl(null);
        }
      }
    };

    fetchProfileImage();
    return () => {
      cancelled = true;
    };
  }, [user?.profile?.profileImageId]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="relative flex shrink-0">
      <div
        className={`bg-white border-r border-gray-200 h-screen flex flex-col shrink-0 transition-all duration-300 ${
          isExpanded ? 'w-[180px]' : 'w-[64px]'
        }`}
      >
        {/* Logo Section */}
        <div className="border-b border-gray-200 px-6 py-6 h-[81px] flex items-center">
          <button
            onClick={() => navigate('/main')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-[#101828] rounded-[10px] flex items-center justify-center shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            {isExpanded && (
              <span
                className="text-2xl text-gray-900 whitespace-nowrap"
                style={{ fontFamily: 'Princess Sofia, cursive' }}
              >
                MateTrip
              </span>
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-2 py-4 flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            {/* AI Chat */}
            {/* <button
            onClick={handleAIChatClick}
            className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
              isExpanded ? 'px-4' : 'justify-center'
            } ${
              isActive('/ai-chat')
                ? 'bg-[#101828] text-white'
                : 'text-[#364153] hover:bg-gray-100'
            }`}
            title={!isExpanded ? 'AI Chat' : ''}
          >
            <MessageSquare className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="font-normal text-base whitespace-nowrap">AI Chat</span>}
          </button> */}

            {/* 여행 모두보기 */}

            {/* Main */}
            <button
              onClick={() => navigate('/main')}
              className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
                isExpanded ? 'px-4' : 'justify-center'
              } ${
                isActive('/main')
                  ? 'bg-[#101828] text-white'
                  : 'text-[#364153] hover:bg-gray-100'
              }`}
              title={!isExpanded ? 'AI 동행 찾기' : ''}
            >
              <Plane className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="font-normal text-base whitespace-nowrap">
                  Main
                </span>
              )}
            </button>

            {/* All-Trip */}
            <button
              onClick={() => navigate('/ai-matching')}
              className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
                isExpanded ? 'px-4' : 'justify-center'
              } ${
                isActive('/ai-matching')
                  ? 'bg-[#101828] text-white'
                  : 'text-[#364153] hover:bg-gray-100'
              }`}
              title={!isExpanded ? 'All-Trip' : ''}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="font-normal text-base whitespace-nowrap">
                  메이트 매칭
                </span>
              )}
            </button>

            {/* 모든 동행 */}
            <button
              onClick={() => navigate('/all-posts')}
              className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
                isExpanded ? 'px-4' : 'justify-center'
              } ${
                isActive('/all-posts')
                  ? 'bg-[#101828] text-white'
                  : 'text-[#364153] hover:bg-gray-100'
              }`}
              title={!isExpanded ? '모든 여행' : ''}
            >
              <FileText className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="font-normal text-base whitespace-nowrap">
                  모든 여행
                </span>
              )}
            </button>

            {/* SAVE - 로그인 사용자만 */}
            {isLoggedIn && (
              <button
                onClick={() => navigate('/save')}
                className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
                  isExpanded ? 'px-4' : 'justify-center'
                } ${
                  isActive('/save')
                    ? 'bg-[#101828] text-white'
                    : 'text-[#364153] hover:bg-gray-100'
                }`}
                title={!isExpanded ? 'SAVE' : ''}
              >
                <Heart className="w-5 h-5 shrink-0" />
                {isExpanded && (
                  <span className="font-normal text-base whitespace-nowrap">
                    나의 여행
                  </span>
                )}
              </button>
            )}

            {/* Inspiration */}
            <button
              onClick={() => navigate('/inspiration')}
              className={`flex items-center gap-3 h-12 rounded-[10px] transition-colors ${
                isExpanded ? 'px-4' : 'justify-center'
              } ${
                isActive('/inspiration')
                  ? 'bg-[#101828] text-white'
                  : 'text-[#364153] hover:bg-gray-100'
              }`}
              title={!isExpanded ? 'Inspiration' : ''}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              {isExpanded && (
                <span className="font-normal text-base whitespace-nowrap">
                  Hot Place
                </span>
              )}
            </button>
          </div>

          {/* Vertical Mate Trip Text */}
          <div
            className="flex justify-center items-center overflow-hidden transition-all duration-300"
            style={{ height: isExpanded ? 'auto' : '100px' }}
          ></div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 px-4 py-4">
          {/* Profile or Login Section */}
          {isLoggedIn ? (
            <div
              className={`flex items-center justify-between transition-all duration-300 ${isExpanded ? 'flex-row gap-3' : 'flex-col gap-10'}`}
            >
              <button
                onClick={onProfileClick}
                className={`flex items-center gap-3 rounded-[10px] hover:bg-gray-100 transition-all duration-300 ${
                  isExpanded ? 'px-0' : 'justify-center w-full'
                }`}
                title={
                  !isExpanded ? user?.profile?.nickname || '내 프로필' : ''
                }
              >
                <div className="w-11 h-11 rounded-full bg-[#e5e7eb] overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300">
                  <img
                    src={
                      user?.profile?.profileImageId && profileImageUrl
                        ? profileImageUrl
                        : `https://ui-avatars.com/api/?name=${user?.profile?.nickname}&background=random`
                    }
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                {isExpanded && (
                  <div className="flex-1 text-left overflow-hidden transition-all duration-300">
                    <p className="text-sm font-normal text-gray-900 truncate">
                      {user?.profile.nickname}
                    </p>
                  </div>
                )}
              </button>
              <div className="flex justify-center transition-all duration-300">
                <NotificationPanel />
              </div>
            </div>
          ) : (
            <Button
              onClick={onLoginClick}
              className={`w-full gap-2 bg-[#101828] hover:bg-[#1f2937] transition-all duration-300 ${
                !isExpanded ? 'px-2' : ''
              }`}
              title={!isExpanded ? '로그인' : ''}
            >
              <LogIn className="w-4 h-4" />
              {isExpanded && '로그인'}
            </Button>
          )}
        </div>
      </div>

      {/* Toggle Button - 사이드바 중간 오른쪽에 살짝 튀어나온 형태 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-20 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-all shadow-md z-10"
        title={isExpanded ? '사이드바 축소' : '사이드바 확장'}
      >
        {isExpanded ? (
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-600" />
        )}
      </button>
    </div>
  );
}
