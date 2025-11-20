import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { MainPostCard } from './MainPostCard';
import { PlaceRecommendationSection } from './PlaceRecommendationSection';
import { InspirationCard } from './InspirationCard';
import { PostDetail } from './PostDetail';
import { PostPreview } from './PostPreview';
import { SimpleKakaoMap } from './SimpleKakaoMap';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import { type Post } from '../types/post';
import { type PlaceDto } from '../types/place';
import type { MatchCandidateDto } from '../types/matching';

interface PopularPlaceResponse {
  addplace_id: string;
  title: string;
  address: string;
  image_url?: string;
  summary?: string;
  latitude: number;
  longitude: number;
}

interface Place {
  id: string;
  title: string;
  address: string;
  imageUrl?: string;
  summary?: string;
  latitude: number;
  longitude: number;
}

interface NewMainPageProps {
  onCreatePost: () => void;
  onJoinWorkspace: (postId: string, workspaceName: string) => void;
  onViewProfile: (userId: string) => void;
  onEditPost: (post: Post) => void;
  onDeleteSuccess?: () => void;
}

type SelectedType = 'post' | 'place' | 'inspiration' | null;

export function NewMainPage({
  onCreatePost,
  onJoinWorkspace,
  onViewProfile,
  onEditPost,
  onDeleteSuccess,
}: NewMainPageProps) {
  const navigate = useNavigate();
  const { user, isAuthLoading } = useAuthStore();
  const isLoggedIn = !!user;

  // Data states
  const [posts, setPosts] = useState<Post[]>([]);
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [inspirations, setInspirations] = useState<Place[]>([]);

  // Loading states
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isInspirationsLoading, setIsInspirationsLoading] = useState(true);

  // Selection states
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDto | null>(null);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);

  // Fetch all posts
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const fetchPosts = async () => {
      setIsPostsLoading(true);
      try {
        const response = await client.get<Post[]>('/posts');
        const sorted = response.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const recruiting = sorted.filter((post) => post.status === '모집중');
        setPosts(recruiting);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsPostsLoading(false);
      }
    };

    fetchPosts();
  }, [isAuthLoading]);

  // Fetch matching data (로그인 필요)
  useEffect(() => {
    if (isAuthLoading || !isLoggedIn || !user?.userId) {
      setIsMatchesLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMatches = async () => {
      setIsMatchesLoading(true);
      try {
        const response = await client.post<MatchCandidateDto[]>(
          '/profile/matching/search',
          { limit: 3 }
        );
        if (!isMounted) return;
        setMatches(response.data ?? []);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch matches:', error);
      } finally {
        if (isMounted) {
          setIsMatchesLoading(false);
        }
      }
    };

    fetchMatches();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isLoggedIn, user?.userId]);

  // Fetch inspiration places
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const fetchInspirations = async () => {
      setIsInspirationsLoading(true);
      try {
        const response = await client.get<PopularPlaceResponse[]>(
          '/places/popular',
          { params: { page: 1, limit: 3 } }
        );

        // 각 장소의 상세 정보를 가져와서 latitude, longitude 포함
        const detailedPlaces = await Promise.all(
          response.data.map(async (item) => {
            try {
              // 각 장소의 상세 정보 가져오기
              const detailResponse = await client.get(
                `/places/${item.addplace_id}`
              );

              return {
                id: item.addplace_id,
                title: item.title,
                address: item.address,
                imageUrl: item.image_url,
                summary: detailResponse.data.summary,
                latitude: detailResponse.data.latitude,
                longitude: detailResponse.data.longitude,
              };
            } catch (error) {
              console.error(
                `Failed to fetch detail for ${item.addplace_id}:`,
                error
              );
              // 상세 정보를 가져오지 못한 경우 기본값 사용
              return {
                id: item.addplace_id,
                title: item.title,
                address: item.address,
                imageUrl: item.image_url,
                summary: undefined,
                latitude: 37.5665, // 서울 시청 기본값
                longitude: 126.978,
              };
            }
          })
        );

        setInspirations(detailedPlaces);
      } catch (error) {
        console.error('Failed to fetch inspirations:', error);
      } finally {
        setIsInspirationsLoading(false);
      }
    };

    fetchInspirations();
  }, [isAuthLoading]);

  // Calculate matched posts with scores
  const matchedPosts = matches
    .map((match) => {
      const post = posts.find((p) => {
        const writerIds = [
          p.writerId,
          p.writer?.id,
          p.writerProfile?.id,
        ].filter(Boolean);
        return writerIds.includes(match.userId);
      });
      return post ? { post, score: Math.round(match.score * 100) } : null;
    })
    .filter((item): item is { post: Post; score: number } => item !== null)
    .slice(0, 3);

  // Handlers
  const handlePostClick = (postId: string) => {
    // PostDetail 내부에서 로그인 상태에 따라 버튼을 처리하므로
    // 여기서는 바로 표시
    console.log('🟢 handlePostClick 호출됨!', {
      postId,
      isLoggedIn,
      현재상태: { selectedType, selectedId },
    });
    setSelectedType('post');
    setSelectedId(postId);
    console.log('🟢 State 설정 완료:', {
      새로운상태: { selectedType: 'post', selectedId: postId },
    });
  };

  const handlePlaceClick = (placeId: string, place: PlaceDto) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setSelectedType('place');
    setSelectedId(placeId);
    setSelectedPlace(place);
  };

  const handleInspirationClick = (place: Place) => {
    setSelectedType('inspiration');
    setSelectedId(place.id);
    // Convert Place to PlaceDto
    const placeDto: PlaceDto = {
      id: place.id,
      category: '기타' as any,
      title: place.title,
      address: place.address,
      summary: place.summary,
      image_url: place.imageUrl,
      longitude: place.longitude,
      latitude: place.latitude,
    };
    setSelectedPlace(placeDto);
  };

  const handleAllViewMatching = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    navigate('/ai-matching');
  };

  const handleAllViewInspiration = () => {
    navigate('/inspiration');
  };

  return (
    <div className="flex h-full bg-white relative">
      {/* Center Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-6 md:py-8 lg:py-12 lg:mr-[400px] xl:mr-[900px] ">
        {/* Section 1: AI 추천 동행 (유저-게시글 매칭) */}
        <section className="mb-8 md:mb-10 lg:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
            <div>
              <h2 className="text-xl md:text-xl font-bold text-gray-900">
                {user?.profile.nickname}님의 성향에 맞을 수도 있는 동행의
                여행일정
              </h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">
                MateTrip AI가 추천하는 최적의 여행 파트너
              </p>
            </div>
            <Button
              onClick={handleAllViewMatching}
              variant="ghost"
              className="text-sm self-start sm:self-auto"
            >
              All View
            </Button>
          </div>

          {(() => {
            console.log('🎯 Section 1 렌더링 조건:', {
              isLoggedIn,
              isMatchesLoading,
              isPostsLoading,
              matchedPostsLength: matchedPosts.length,
              렌더링할내용: !isLoggedIn
                ? '로그인 필요'
                : isMatchesLoading || isPostsLoading
                  ? '로딩 중'
                  : matchedPosts.length === 0
                    ? '추천 없음'
                    : '카드 렌더링',
            });
            return null;
          })()}
          {!isLoggedIn ? (
            <div className="bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-6 border border-blue-100">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  로그인이 필요합니다
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  당신에게 딱 맞는 동행을 AI가 추천해드려요
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  로그인하기
                </Button>
              </div>
            </div>
          ) : isMatchesLoading || isPostsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full aspect-[203/241] bg-gray-200 rounded-[16px] animate-pulse"
                />
              ))}
            </div>
          ) : matchedPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              추천할 동행이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {matchedPosts.map(({ post, score }) => {
                console.log('🟡 MainPostCard 렌더링:', {
                  postId: post.id,
                  title: post.title,
                  score,
                  handlePostClick: typeof handlePostClick,
                });
                return (
                  <MainPostCard
                    key={post.id}
                    post={post}
                    matchingScore={score}
                    imageUrl={post.imageId || undefined}
                    onClick={handlePostClick}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: 장소 추천 */}
        <PlaceRecommendationSection onPlaceClick={handlePlaceClick} />

        {/* Section 3: Inspiration */}
        <section className="mb-8 md:mb-10 lg:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
            <div>
              <h2 className="text-xl md:text-xl font-bold text-gray-900">
                Hot Place
              </h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1text-xs md:text-sm text-gray-600 mt-1">
                MateTrip 유저들의 Pick‼
              </p>
            </div>
            <Button
              onClick={handleAllViewInspiration}
              variant="ghost"
              className="text-sm self-start sm:self-auto"
            >
              All View
            </Button>
          </div>

          {isInspirationsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="w-full h-64 bg-gray-200 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : inspirations.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              추천할 장소가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {inspirations.map((place, index) => (
                <InspirationCard
                  key={place.id}
                  imageUrl={place.imageUrl}
                  title={place.title}
                  address={place.address}
                  badgeText={`현재 가장 인기있는 장소 TOP. ${index + 1}`}
                  onClick={() => handleInspirationClick(place)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right Fixed Panel */}
      <div className="md:hidden lg:block fixed right-0 top-0 lg:w-[400px] xl:w-[900px] h-screen border-l border-gray-200 bg-white overflow-hidden z-10">
        {selectedType === 'post' && selectedId ? (
          <PostPreview
            postId={selectedId}
            onJoinWorkspace={onJoinWorkspace}
            onViewFullDetail={() => setShowPostDetailModal(true)}
            onClose={() => {
              setSelectedType(null);
              setSelectedId(null);
            }}
          />
        ) : (selectedType === 'place' || selectedType === 'inspiration') &&
          selectedPlace ? (
          <div className="relative h-full w-full">
            <SimpleKakaoMap
              latitude={selectedPlace.latitude}
              longitude={selectedPlace.longitude}
              placeName={selectedPlace.title}
            />

            {/* 여행 만들기 버튼 */}
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  navigate('/login');
                  return;
                }
                onCreatePost();
              }}
              className="absolute bottom-6 left-6 z-[9999] bg-[#101828] text-white shadow-lg"
            >
              여행 만들기
            </Button>
          </div>
        ) : (
          <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
            {/* 초기 안내 화면 */}
            <div className="text-center px-8">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                여행 카드를 선택하면
                <br />
                상세 정보를 확인할 수 있습니다
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PostDetail Modal - 전체 상세보기 */}
      {showPostDetailModal && selectedId && (
        <PostDetail
          postId={selectedId}
          onJoinWorkspace={onJoinWorkspace}
          onViewProfile={onViewProfile}
          onEditPost={onEditPost}
          onDeleteSuccess={onDeleteSuccess || (() => {})}
          onOpenChange={(open) => {
            setShowPostDetailModal(open);
            if (!open) {
              setSelectedType(null);
              setSelectedId(null);
            }
          }}
        />
      )}
    </div>
  );
}
