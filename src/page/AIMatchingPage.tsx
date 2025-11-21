import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Search as SearchIcon } from 'lucide-react'; // SearchIcon 추가
import { Button } from '../components/ui/button';
import client from '../api/client';
import { type Post, type Writer } from '../types/post';
import { MainPostCardSkeleton } from '../components/AIMatchingSkeletion';
import { MatchingCarousel } from '../components/MatchingCarousel';
import { GridMatchingCard } from '../components/GridMatchingCard';
import { PostDetail } from './PostDetail';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { useAuthStore } from '../store/authStore';
import type {
  MatchingInfo,
  MatchCandidateDto,
  MatchRecruitingPostDto,
  MatchResponseDto,
} from '../types/matching';
import { MatchingSearchBar } from '../components/MatchingSearchBar';
import { toast } from 'sonner';
import type { MatchingResult } from '../types/matchSearch'; // MatchingResult 타입 임포트
import type { KeywordValue } from '../utils/keyword'; // KeywordValue 타입 임포트
import { ProfileModal } from '../components/ProfileModal'; // ProfileModal 임포트 추가

interface MainPageProps {
  onSearch: (params: {
    startDate?: string;
    endDate?: string;
    location?: string;
    title?: string;
    keyword?: string;
  }) => void;
  onViewPost: (postId: string) => void;
  onCreatePost: () => void;
  isLoggedIn: boolean;
  fetchTrigger: number;
}

const normalizeTextList = (values?: unknown): string[] => {
  if (!values) {
    return [];
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

  return normalized;
};

const normalizeOverlapText = (values?: unknown): string | undefined => {
  const normalized = normalizeTextList(values);
  if (!normalized.length) {
    return undefined;
  }
  return normalized.join(', ');
};

const toPercent = (value?: number) => {
  if (value === undefined || value === null) {
    return 0;
  }
  return Math.round(value <= 1 ? value * 100 : value);
};

const buildWriterFromCandidate = (
  candidate: MatchCandidateDto
): Writer | undefined => {
  const profile = candidate.profile;
  if (!profile) {
    return undefined;
  }

  const travelStyles = Array.isArray(profile.travelStyles)
    ? profile.travelStyles.map((style) => String(style))
    : [];
  const tendencies = Array.isArray(profile.tendency)
    ? profile.tendency.map((tendency) => String(tendency))
    : [];

  return {
    id: candidate.userId,
    email: '',
    profile: {
      id: profile.id ?? candidate.userId,
      nickname: profile.nickname ?? '작성자',
      gender: profile.gender ?? '',
      description: profile.description ?? '',
      intro: profile.intro ?? '',
      mbtiTypes: profile.mbtiTypes ?? '',
      travelStyles,
      tendency: tendencies,
      profileImageId:
        profile.profileImageId ?? candidate.profileImageId ?? undefined,
    },
  };
};

const normalizeKeywords = (keywords?: KeywordValue[]) =>
  normalizeTextList(keywords);

const convertRecruitingPostToPost = (
  recruitingPost: MatchRecruitingPostDto,
  candidate: MatchCandidateDto,
  writer?: Writer
): Post => {
  return {
    id: recruitingPost.id,
    writerId: recruitingPost.writerId ?? candidate.userId,
    writerProfile: undefined,
    writer: recruitingPost.writer ?? writer,
    createdAt: recruitingPost.createdAt ?? new Date().toISOString(),
    title: recruitingPost.title,
    content: recruitingPost.content ?? '',
    status: recruitingPost.status ?? '모집중',
    location: recruitingPost.location,
    maxParticipants: recruitingPost.maxParticipants,
    keywords: normalizeKeywords(recruitingPost.keywords),
    startDate: recruitingPost.startDate ?? '',
    endDate: recruitingPost.endDate ?? '',
    participations: recruitingPost.participations ?? [],
    imageId: recruitingPost.imageId ?? null,
    matchResult: undefined,
  };
};

export function MainPage({ fetchTrigger, isLoggedIn }: MainPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuthStore();
  const [matches, setMatches] = useState<MatchCandidateDto[]>([]);
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);

  // 모달 상태 관리
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 작성자 프로필 이미지 관리
  const [writerProfileImages, setWriterProfileImages] = useState<
    Record<string, string | null>
  >({});

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement | null>(null);

  // 검색 결과 상태 추가
  const [searchResults, setSearchResults] = useState<MatchingResult[] | null>(
    null
  );
  const [searchQueryInfo, setSearchQueryInfo] = useState<{
    location?: string;
    startDate?: string;
    endDate?: string;
    keyword?: KeywordValue[];
  } | null>(null);

  // ProfileModal 상태 추가
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    if (!isLoggedIn || !user?.userId) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const res = await client.post<MatchCandidateDto[] | MatchResponseDto>(
          '/profile/matching/search',
          {
            limit: 15,
          }
        );
        if (!isMounted) {
          return;
        }
        console.log('match response', res.data);
        const payload = Array.isArray(res.data)
          ? res.data
          : (res.data?.matches ?? []);
        setMatches(payload ?? []);

        // TODO: 매너온도 API 연동
        // 향후 백엔드에서 MatchCandidateDto에 mannerTemperature 필드 추가 예정
        // 또는 별도 엔드포인트: GET /users/:userId/profile 호출하여 매너온도 가져오기
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to fetch matches', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMatches();
    console.log('matching search 완료!');

    return () => {
      isMounted = false;
    };
  }, [
    fetchTrigger,
    isAuthLoading,
    isLoggedIn,
    profileUpdateTrigger,
    user?.userId,
  ]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterContainerRef.current &&
        !filterContainerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const { recommendedPosts, matchingInfoByPostId } = useMemo(() => {
    const entries: Array<{ post: Post; info: MatchingInfo }> = [];
    const seenPostIds = new Set<string>();

    matches.forEach((candidate) => {
      const writer = buildWriterFromCandidate(candidate);
      const tendencyText = normalizeOverlapText(
        candidate.overlappingTendencies
      );
      const styleText = normalizeOverlapText(candidate.overlappingTravelStyles);

      (candidate.recruitingPosts ?? []).forEach((matchPost) => {
        if (seenPostIds.has(matchPost.id)) {
          return;
        }

        seenPostIds.add(matchPost.id);

        const normalizedPost = convertRecruitingPostToPost(
          matchPost,
          candidate,
          writer
        );

        entries.push({
          post: normalizedPost,
          info: {
            score: toPercent(candidate.score),
            vectorScore:
              candidate.vectorScore !== undefined
                ? toPercent(candidate.vectorScore)
                : undefined,
            tendency: tendencyText,
            style: styleText,
          },
        });
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
  }, [matches]);

  // 작성자 프로필 이미지 일괄 로드 (ProfileModal 방식과 동일)
  useEffect(() => {
    const fetchAllWriterProfileImages = async () => {
      // 1. 모든 게시글에서 작성자의 profileImageId 수집
      const allPosts = searchResults
        ? searchResults.map((res) => res.post)
        : recommendedPosts;
      const imageIds = allPosts
        .map((post) => post.writer?.profile?.profileImageId)
        .filter((id): id is string => id != null && id.length > 0);

      // 검색 결과의 writerProfileImageId도 수집
      if (searchResults) {
        searchResults.forEach((result) => {
          if (
            result.writerProfileImageId &&
            result.writerProfileImageId.length > 0
          ) {
            imageIds.push(result.writerProfileImageId);
          }
        });
      }

      // 2. 중복 제거
      const uniqueImageIds = Array.from(new Set(imageIds));

      if (uniqueImageIds.length === 0) {
        return;
      }

      try {
        // 3. Promise.all로 병렬 처리
        const results = await Promise.all(
          uniqueImageIds.map(async (imageId) => {
            try {
              const { data } = await client.get<{ url: string }>(
                `/binary-content/${imageId}/presigned-url`
              );
              return { imageId, url: data.url };
            } catch (error) {
              console.error(`Failed to load profile image ${imageId}:`, error);
              return { imageId, url: null };
            }
          })
        );

        // 4. State에 저장
        const imageMap: Record<string, string | null> = {};
        results.forEach(({ imageId, url }) => {
          imageMap[imageId] = url;
        });
        setWriterProfileImages(imageMap);
      } catch (error) {
        console.error('Failed to fetch writer profile images:', error);
      }
    };

    if (
      recommendedPosts.length > 0 ||
      (searchResults && searchResults.length > 0)
    ) {
      fetchAllWriterProfileImages();
    }
  }, [recommendedPosts, searchResults]); // searchResults 의존성 추가

  const handleCardClick = (post: Post | MatchRecruitingPostDto): void => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    // 모달 직접 열기 (메인페이지 이동 대신)
    setSelectedPostId(post.id);
    setIsModalOpen(true);
  };

  // MatchingSearchBar로부터 검색 결과를 받는 핸들러
  const handleSearchSuccess = (
    results: MatchingResult[],
    query: {
      location?: string;
      startDate?: string;
      endDate?: string;
      keyword?: KeywordValue[];
    }
  ) => {
    console.log(
      'handleSearchSuccess called with results:',
      results,
      'query:',
      query
    ); // 로그 추가
    setSearchResults(results);
    setSearchQueryInfo(query);
  };

  const handleProfileUpdated = () => {
    setProfileUpdateTrigger((prev) => prev + 1);
    setWriterProfileImages({});
    setSearchResults(null);
    setSearchQueryInfo(null);
  };

  const keywordsText = useMemo(() => {
    if (!searchQueryInfo) return '';
    const parts: string[] = [];
    if (searchQueryInfo.location) parts.push(searchQueryInfo.location);
    if (searchQueryInfo.startDate) parts.push(searchQueryInfo.startDate);
    if (searchQueryInfo.endDate) parts.push(searchQueryInfo.endDate);
    if (searchQueryInfo.keyword && searchQueryInfo.keyword.length > 0) {
      parts.push(...searchQueryInfo.keyword);
    }
    return parts.join(', ');
  }, [searchQueryInfo]);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-16 py-22">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            MateTrip AI가 추천하는 최적의 여행 파트너
          </h1>
        </div>
        {/* 로그인하지 않은 사용자를 위한 안내 배너 */}
        {!isLoggedIn && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    AI 맞춤 추천을 받아보세요
                  </h3>
                  <p className="text-sm text-gray-600">
                    로그인하면 당신에게 딱 맞는 동행을 AI가 추천해드려요
                  </p>
                </div>
              </div>
              <Button
                onClick={() => (window.location.href = '/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                로그인하기
              </Button>
            </div>
          </div>
        )}
        {/* Recommended Posts Section - 모든 사용자에게 표시 */}
        {!searchResults && ( // 검색 결과가 없을 때만 캐러셀 표시
          <section className="mb-12">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <MainPostCardSkeleton key={index} />
                ))}
              </div>
            ) : recommendedPosts.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                추천할 동행이 없습니다.
              </div>
            ) : (
              <MatchingCarousel
                posts={recommendedPosts}
                matchingInfoByPostId={matchingInfoByPostId}
                writerProfileImages={writerProfileImages}
                onCardClick={handleCardClick}
              />
            )}
          </section>
        )}

        {/* 전체 추천 동행 그리드 또는 검색 결과 */}
        <section className="mb-12">
          {/* Search Bar and Filters - 로그인한 사용자에게만 표시 */}
          {isLoggedIn && (
            <MatchingSearchBar onSearchSuccess={handleSearchSuccess} />
          )}{' '}
          {/* prop 전달 */}
          {searchResults ? ( // 검색 결과가 있을 경우
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-gray-900 mb-2">맞춤 동행 검색 결과</h1>
                  {keywordsText && (
                    <p className="text-gray-600">
                      "{keywordsText}" 검색 결과 {searchResults.length}개
                    </p>
                  )}
                </div>
                {/* 검색 초기화 버튼 (검색 결과가 있을 때 항상 표시) */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    console.log('상단 검색 초기화 button clicked');
                    setSearchResults(null);
                    setSearchQueryInfo(null);
                  }}
                >
                  전체 목록 보기 {/* 버튼 텍스트 변경 */}
                </Button>
              </div>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-22">
                  {' '}
                  {/* 그리드 클래스 수정 */}
                  {searchResults.map((result, index) => (
                    <GridMatchingCard
                      key={result.post.id}
                      post={result.post}
                      matchingInfo={result.matchingInfo}
                      rank={index + 1}
                      writerProfileImageUrl={
                        result.writerProfileImageId
                          ? (writerProfileImages[result.writerProfileImageId] ??
                            null)
                          : null
                      }
                      writerNickname={result.writerNickname ?? null}
                      onClick={() => handleCardClick(result.post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SearchIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-gray-900 mb-2">
                    표시할 추천 결과가 없습니다
                  </h3>
                  <p className="text-gray-600 mb-6">
                    검색 조건을 다시 입력하거나 다른 키워드로 시도해보세요.
                  </p>
                  {/* 검색 결과가 없을 때의 초기화 버튼은 제거 */}
                </div>
              )}
            </div>
          ) : // 검색 결과가 없을 경우 기존 그리드 표시
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
              {Array.from({ length: 8 }).map((_, index) => (
                <MainPostCardSkeleton key={index} />
              ))}
            </div>
          ) : recommendedPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              추천할 동행이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-14 mt-8">
              {recommendedPosts.map((post, index) => (
                <GridMatchingCard
                  key={post.id}
                  post={post}
                  rank={index + 1}
                  matchingInfo={matchingInfoByPostId?.[post.id] ?? { score: 0 }}
                  writerProfileImageUrl={
                    post.writer?.profile?.profileImageId
                      ? (writerProfileImages[
                          post.writer.profile.profileImageId
                        ] ?? null)
                      : null
                  }
                  writerNickname={post.writer?.profile?.nickname ?? null}
                  onClick={() => handleCardClick(post)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* PostDetail 모달 */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedPostId(null);
          }
        }}
      >
        <DialogContent className="w-full !max-w-[1100px] h-[90vh] p-0 flex flex-col [&>button]:hidden border-0 rounded-lg overflow-hidden">
          {selectedPostId && (
            <PostDetail
              postId={selectedPostId}
              onJoinWorkspace={async (postId, workspaceName) => {
                try {
                  await client.post('/workspace', {
                    postId,
                    workspaceName,
                  });
                  setIsModalOpen(false);
                  setSelectedPostId(null);
                  toast.success('워크스페이스에 입장했습니다.');
                } catch (error) {
                  console.error('Failed to create or join workspace:', error);
                  toast.error(
                    '워크스페이스에 입장하는 중 오류가 발생했습니다.'
                  );
                }
              }}
              onViewProfile={(userId) => {
                console.log('onViewProfile called with userId:', userId);
                // setIsModalOpen(false); // PostDetail 모달을 닫지 않도록 이 줄을 제거합니다.
                // setSelectedPostId(null); // PostDetail 모달의 postId를 초기화하지 않습니다.
                setProfileUserId(userId);
                setShowProfileModal(true);
                console.log(
                  'ProfileModal states after update - showProfileModal:',
                  true,
                  'profileUserId:',
                  userId
                );
              }}
              onEditPost={(post) => {
                setIsModalOpen(false);
                setSelectedPostId(null);
                // 게시글 수정 로직
                console.log('Edit post:', post);
              }}
              onDeleteSuccess={() => {
                setIsModalOpen(false);
                setSelectedPostId(null);
                toast.success('게시글이 삭제되었습니다.');
                // 목록 새로고침
                window.location.reload();
              }}
              onOpenChange={(open) => {
                if (!open) {
                  setIsModalOpen(false);
                  setSelectedPostId(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ProfileModal */}
      {profileUserId && (
        <ProfileModal
          userId={profileUserId}
          open={showProfileModal}
          onOpenChange={(open) => {
            // onClose -> onOpenChange로 수정
            setShowProfileModal(open); // open 값을 직접 사용
            if (!open) {
              setProfileUserId(null);
            }
          }}
          onViewPost={(postId) => {
            setShowProfileModal(false); // 프로필 모달 닫기
            setSelectedPostId(postId); // 게시글 상세 모달을 위해 ID 설정
            setIsModalOpen(true); // 게시글 상세 모달 열기
          }}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </div>
  );
}
