import { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  ClipboardList,
  Plus,
  Info,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import client from '../api/client';
import { type Post } from '../types/post';
import { MainPostCardSkeleton } from './MainPostCardSkeleton';
import { WorkspaceCarousel } from './WorkspaceCarousel';
import { MatchingCarousel } from './MatchingCarousel';
import { useAuthStore } from '../store/authStore';
import type { MatchCandidateDto, MatchingInfo } from '../types/matching';

interface MainPageProps {
  onSearch: (params: {
    startDate?: string;
    endDate?: string;
    location?: string;
    title?: string;
  }) => void;
  onViewPost: (postId: string) => void;
  onCreatePost: () => void;
  isLoggedIn: boolean;
  fetchTrigger: number;
}

const REGION_CATEGORIES = [
  {
    id: 1,
    name: '제주도',
    image:
      'https://images.unsplash.com/photo-1614088459293-5669fadc3448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NjE4NjQwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '힐링 여행의 성지',
  },
  {
    id: 2,
    name: '부산',
    image:
      'https://images.unsplash.com/photo-1665231342828-229205867d94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxiZWFjaCUyMHBhcmFhZGlzZfGVufDF8fHx8MTc2MTg4Mzg2MHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '바다와 도시의 조화',
  },
  {
    id: 3,
    name: '서울',
    image:
      'https://images.unsplash.com/photo-1597552661064-af143a5f3bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxzZW91bCUyMGtvcmVhfGVufDF8fHx8MTc2MTk4MjQzNHww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '트렌디한 도심 여행',
  },
  {
    id: 4,
    name: '경주',
    image:
      'https://images.unsplash.com/photo-1668850443435-c01eec56c4e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxnYnllb25namUlMjBrb3JlYXxlbnwxfHx8fDE3NjE5ODI0MzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '역사 문화 탐방',
  },
  {
    id: 5,
    name: '강릉',
    image:
      'https://images.unsplash.com/photo-1684042229029-8a99193a8e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxnYW5nbmV1bmclMjBrb3JlYXxlbnwxfHx8fDE3NjE5ODI0MzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description: '동해안의 낭만',
  },
  {
    id: 6,
    name: '전주',
    image:
      'https://images.unsplash.com/photo-1520645521318-f03a12f0e67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxjaXR5JTIwdHJhdmVsfGVufDF8fHx8MTc2MTkxMjEzMXww&ixlib=rb-4.1.0&q=80&w=1080',
    description: '맛집 투어의 메카',
  },
];

const normalizeOverlapText = (values?: unknown): string | undefined => {
  if (!values) {
    return undefined;
  }

  const arrayValues = Array.isArray(values) ? values : [values];

  const normalized = arrayValues
    .map((value) => {
      if (!value) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object') {
        const candidate = value as Record<string, unknown>;
        if (typeof candidate.label === 'string') {
          return candidate.label;
        }
        if (typeof candidate.value === 'string') {
          return candidate.value;
        }
        if (typeof candidate.name === 'string') {
          return candidate.name;
        }
      }
      return String(value);
    })
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (!normalized.length) {
    return undefined;
  }

  return normalized.join(', ');
};

export function MainPage({
  onSearch,
  onViewPost,
  onCreatePost,
  isLoggedIn,
  fetchTrigger,
}: MainPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Single loading state for both sections
  const { user, isAuthLoading } = useAuthStore(); // Get user and isAuthLoading from auth store
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [featuredView, setFeaturedView] = useState<'latest' | 'recommended'>(
    'latest'
  );
  const travelStyleKey =
    user?.profile?.travelStyles?.join(',') ??
    user?.profile?.travelStyles?.toString() ??
    '';
  const tendencyKey =
    user?.profile?.tendency?.join(',') ??
    user?.profile?.tendency?.toString() ??
    '';
  const descriptionKey = user?.profile?.description ?? '';

  useEffect(() => {
    // isAuthLoading이 true일 때는 API 호출을 하지 않습니다.
    // user 정보가 완전히 로드될 때까지 기다립니다.
    if (isAuthLoading) {
      setIsLoading(true); // 인증 정보 로딩 중에는 전체 페이지 로딩 상태 유지
      return;
    }

    const fetchAllPosts = async () => {
      setIsLoading(true);
      try {
        const [initialPostsResponse, userPostsResponse] = await Promise.all([
          client.get<Post[]>('/posts'),
          isLoggedIn && user?.userId
            ? client.get<Post[]>(`/posts/user/${user.userId}`)
            : Promise.resolve({ data: [] }), // If not logged in or userId not available, resolve with empty array
        ]);

        // 전체 글 목록: 최신순으로 정렬
        const sortedInitialPosts = initialPostsResponse.data.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // '최신 동행 모집' 섹션에는 '모집중'인 글만 필터링하여 설정
        const recruitingPosts = sortedInitialPosts.filter(post => post.status === '모집중');
        setPosts(recruitingPosts);
        console.log(`최신 동행 글 목록`, sortedInitialPosts);

        if (isLoggedIn && user?.userId) {
          const sortedUserPosts = userPostsResponse.data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setUserPosts(sortedUserPosts);
          console.log(
            `${user.profile.nickname}님이 참여중인 여행`,
            sortedUserPosts
          );
        } else {
          setUserPosts([]);
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPosts();
  }, [
    isLoggedIn,
    user?.userId,
    user?.profile.nickname,
    isAuthLoading,
    fetchTrigger,
  ]); // Add fetchTrigger to dependency array

  // matching 유사도로 추천 글 받아오기 (로그인 시점에 맞춰 다시 호출)
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isLoggedIn || !user?.userId) {
      setMatches([]);
      setIsMatchesLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMatches = async () => {
      setIsMatchesLoading(true);
      try {
        const res = await client.post<MatchCandidateDto[]>('/matching/search', {
          limit: 5,
        });
        if (!isMounted) {
          return;
        }
        console.log('match response', res.data);
        setMatches(res.data ?? []);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to fetch matches', err);
      } finally {
        if (isMounted) {
          setIsMatchesLoading(false);
        }
      }
    };

    fetchMatches();
    console.log('matching search 완료!');

    return () => {
      isMounted = false;
    };
  }, [
    isAuthLoading,
    isLoggedIn,
    user?.userId,
    travelStyleKey,
    tendencyKey,
    descriptionKey,
  ]);

  // const handleSearch = (e: React.FormEvent) => {
  //   e?.preventDefault();
  //   onSearch({
  //     startDate: searchStartDate,
  //     endDate: searchEndDate,
  //     location: searchLocation,
  //     title: searchTitle,
  //   });
  // };

  useEffect(() => {
    if (!isLoggedIn) {
      setFeaturedView('latest');
    }
  }, [isLoggedIn]);

  const { recommendedPosts, matchingInfoByPostId } = useMemo(() => {
    const toPercent = (value?: number) => {
      if (value === undefined || value === null) {
        return 0;
      }
      return Math.round(value <= 1 ? value * 100 : value);
    };

    const entries: Array<{ post: Post; info: MatchingInfo }> = [];
    const seenPostIds = new Set<string>();

    matches.forEach((candidate) => {
      const matchedPost = posts.find((post) => {
        const writerIds = [
          post.writerId,
          post.writer?.id,
          post.writerProfile?.id,
        ].filter(Boolean);
        return writerIds.includes(candidate.userId);
      });

      if (!matchedPost || seenPostIds.has(matchedPost.id)) {
        return;
      }

      seenPostIds.add(matchedPost.id);

      const tendencyText = normalizeOverlapText(
        candidate.overlappingTendencies
      );

      const styleText = normalizeOverlapText(candidate.overlappingTravelStyles);

      entries.push({
        post: matchedPost,
        info: {
          score: toPercent(candidate.score),
          vectorscore:
            candidate.vectorScore !== undefined
              ? toPercent(candidate.vectorScore)
              : undefined,
          tendency: tendencyText,
          style: styleText,
        },
      });
    });

    return {
      recommendedPosts: entries.map((entry) => entry.post),
      matchingInfoByPostId: entries.reduce<Record<string, MatchingInfo>>(
        (acc, entry) => {
          acc[entry.post.id] = entry.info;
          return acc;
        },
        {}
      ),
    };
  }, [matches, posts]);

  const activeFeaturedView =
    featuredView === 'recommended' && isLoggedIn ? 'recommended' : 'latest';

  const featuredTitle =
    activeFeaturedView === 'recommended' && user
      ? `${user?.profile.nickname}님과 성향이 비슷한 유저들이 동행을 구하고 있어요`
      : '최신 동행 모집';

  const isFeaturedLoading =
    activeFeaturedView === 'recommended' ? isMatchesLoading : isLoading;

  const featuredItems =
    activeFeaturedView === 'recommended' ? recommendedPosts : posts;

  const featuredEmptyMessage =
    activeFeaturedView === 'recommended'
      ? '추천할 게시글이 없습니다.'
      : '최신 게시글이 없습니다.';

  const handleFeaturedViewChange = (view: 'latest' | 'recommended') => {
    if (view === 'recommended' && !isLoggedIn) {
      return;
    }
    setFeaturedView(view);
  };

  const isRecommendedButtonDisabled = !isLoggedIn;
  const isRecommendedView = activeFeaturedView === 'recommended';

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
      {!isLoggedIn && (
        <div className="mb-8 rounded-2xl border border-blue-200 bg-white p-4 text-center shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            로그인하고 동행을 추천받아보세요
          </h2>
          <p className="text-sm text-gray-600">
            여행 스타일, 성향, 프로필, MBTI 정보를 바탕으로 맞춤 동행을 확인할
            수 있어요.
          </p>
        </div>
      )}
      {/* --- User's Participating Trips Section --- */}
      {isLoggedIn && (
        <>
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {isLoading ? (
                  <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                ) : (
                  // user?.profile.nickname은 isLoading이 false일 때 안전하게 접근 가능
                  `${user?.profile.nickname}님이 참여중인 여행`
                )}
              </h2>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <MainPostCardSkeleton key={index} />
                ))}
              </div>
            ) : userPosts.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                참여중인 게시글이 없습니다.
              </div>
            ) : (
              <WorkspaceCarousel
                posts={userPosts}
                onCardClick={(post) => onViewPost(post.id)}
              />
            )}
          </section>
        </>
      )}

      {/* --- Featured Section (Latest / Recommended toggle) --- */}
      {isLoggedIn ? (
        <section className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {isFeaturedLoading ? (
                      <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                    ) : (
                      featuredTitle
                    )}
                  </h2>
                </div>
              </div>
              {isRecommendedView && (
                <p className="text-sm font-medium text-blue-900/80 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  여행 성향·스타일·프로필 상세소개·MBTI를 모두 반영한 맞춤 추천
                  리스트예요.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => handleFeaturedViewChange('latest')}
                className={`px-4 py-1 text-sm font-medium rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                  activeFeaturedView === 'latest'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                최신글 보기
              </button>
              <button
                type="button"
                onClick={() => handleFeaturedViewChange('recommended')}
                disabled={isRecommendedButtonDisabled}
                className={`px-4 py-1 text-sm font-medium rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                  isRecommendedView
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-pink-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                } ${
                  isRecommendedButtonDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4" />
                  추천 동행
                </span>
              </button>
            </div>
          </div>
          {isFeaturedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : featuredItems.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              {featuredEmptyMessage}
            </div>
          ) : isRecommendedView ? (
            <MatchingCarousel
              posts={featuredItems}
              matchingInfoByPostId={matchingInfoByPostId}
              onCardClick={(post) => onViewPost(post.id)}
            />
          ) : (
            <WorkspaceCarousel
              posts={featuredItems}
              onCardClick={(post) => onViewPost(post.id)}
            />
          )}
        </section>
      ) : (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">최신 동행 모집</h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              최신 게시글이 없습니다.
            </div>
          ) : (
            <WorkspaceCarousel
              posts={posts}
              onCardClick={(post) => onViewPost(post.id)}
            />
          )}
        </section>
      )}

      {/* --- Region Categories Section --- */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">인기 여행지</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {REGION_CATEGORIES.map((region) => (
            <button
              key={region.id}
              onClick={() => onSearch({ location: region.name })}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <ImageWithFallback
                src={region.image}
                alt={region.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="mb-1">{region.name}</h3>
                <p className="text-xs text-gray-200">{region.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {isLoggedIn && (
        <Button
          onClick={onCreatePost}
          className="fixed bottom-8 right-8 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center z-40"
          aria-label="게시글 작성"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      )}
    </div>
  );
}
