import { useState, useEffect } from 'react';
import {
  // Lucide-react 아이콘 임포트
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Thermometer,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Button } from './ui/button'; // UI 컴포넌트 임포트
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import client from '../api/client'; // API 클라이언트 임포트
import { type Post } from './PostCard'; // Post 타입 임포트
import { translateKeyword } from '../utils/keyword'; // 키워드 번역 함수 임포트
import { useAuthStore } from '../store/authStore';

interface PostDetailProps {
  postId: string;
  isLoggedIn: boolean;
  onJoinWorkspace: (postId: string) => void;
  onEditPost: () => void;
}

export function PostDetail({
  postId,
  isLoggedIn,
  onJoinWorkspace,
  onEditPost,
}: PostDetailProps) {
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [hasApplied, setHasApplied] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    const fetchPostDetail = async () => {
      if (!postId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await client.get<Post>(`/post/${postId}`);
        setPost(response.data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch post details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostDetail();
  }, [postId]);

  // 현재 로그인한 사용자가 게시글 작성자인지 확인
  const isAuthor = user && post ? user.id === post.writerProfile.id : false;

  const handleApply = () => {
    setHasApplied(true);
  };

  const handleAcceptRequest = (userId: number) => {
    console.log('Accept request from user:', userId);
  };

  const handleRejectRequest = (userId: number) => {
    console.log('Reject request from user:', userId);
  };

  // TODO: 매너온도 기능 구현 시 실제 데이터와 연동 필요
  const getTempColor = (temp: number) => {
    if (temp >= 38) return 'text-green-600';
    if (temp >= 37) return 'text-blue-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return <div className="text-center py-16">게시글을 불러오는 중...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-16 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  if (!post) {
    return <div className="text-center py-16">게시글을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        뒤로 가기
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Header Image */}
          <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
            <ImageWithFallback
              src={
                post.image ||
                'https://images.unsplash.com/photo-1533106418989-87423dec6922?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWx8ZW58MXx8fHwxNzIxNzE2MDMwfDA&ixlib=rb-4.1.0&q=80&w=1080'
              }
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <Badge
              className={`absolute top-4 right-4 ${
                post.status === '모집중' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              {post.status}
            </Badge>
          </div>

          {/* Title and Author */}
          <div className="mb-6">
            <h1 className="text-gray-900 mb-4">{post.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                <div>
                  <div className="text-gray-900">
                    {post.writerProfile.nickname}
                  </div>
                  {/* TODO: 매너온도 기능 구현 시 아래 코드 활성화 */}
                  {/* <div
                    className={`text-sm flex items-center gap-1 ${getTempColor(36.5)}`}
                  >
                    <Thermometer className="w-4 h-4" />
                    매너온도 36.5°C
                  </div> */}
                </div>
              </div>

              {isAuthor && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditPost}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {post.writerProfile.travelStyles?.map((style) => (
                <Badge key={style} variant="secondary">
                  {translateKeyword(style)}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-4">여행 소개</h3>
            {post.content ? (
              <p className="text-gray-700 whitespace-pre-line">
                {post.content}
              </p>
            ) : (
              <p className="text-gray-500">작성된 여행 소개가 없습니다.</p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Current Members */}
          {/* TODO: 참여중인 동행 목록 API 연동 필요 */}
          <div>
            <h3 className="text-gray-900 mb-4">참여중인 동행 (1명)</h3>
            <div className="space-y-3">
              {/* {MOCK_POST.currentMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{member.name}</span>
                      {member.isAuthor && (
                        <Badge variant="secondary" className="text-xs">
                          방장
                        </Badge>
                      )}
                    </div>
                    <div className={`text-sm ${getTempColor(member.temp)}`}>
                      매너온도 {member.temp}°C
                    </div>
                  </div>
                </div>
              ))} */}
            </div>
          </div>

          {/* Pending Requests (Author Only) */}
          {/* TODO: 동행 신청 목록 API 연동 필요 */}
          {isAuthor &&
            false && ( // MOCK_POST.pendingRequests.length > 0
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="text-gray-900 mb-4">동행 신청 (0명)</h3>
                  <div className="space-y-3">
                    {/* {MOCK_POST.pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                      <div className="flex-1">
                        <div className="text-gray-900 mb-1">{request.name}</div>
                        <div className="flex gap-1 mb-2">
                          {request.travelStyle.map((style) => (
                            <Badge
                              key={style}
                              variant="outline"
                              className="text-xs"
                            >
                              {style}
                            </Badge>
                          ))}
                        </div>
                        <div
                          className={`text-sm ${getTempColor(request.temp)}`}
                        >
                          매너온도 {request.temp}°C
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAcceptRequest(request.id)}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request.id)}
                          className="gap-1"
                        >
                          <X className="w-4 h-4" />
                          거절
                        </Button>
                      </div>
                    </div>
                  ))} */}
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h3 className="text-gray-900 mb-4">여행 정보</h3>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">여행 일정</div>
                  <div>{`${post.startDate} ~ ${post.endDate}`}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">여행지</div>
                  <div>{post.location}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">모집 인원</div>
                  <div>
                    {/* TODO: 현재 참여 인원 API 연동 필요 */}
                    {post.participants || 1} / {post.maxParticipants}명
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">여행 키워드</div>
              <div className="flex flex-wrap gap-2">
                {post.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {translateKeyword(keyword)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* --- 버튼 영역: 로그인 상태 및 작성자 여부에 따라 분기 --- */}
            {!isLoggedIn && (
              <Button disabled className="w-full">
                로그인 후 신청 가능
              </Button>
            )}

            {isLoggedIn && isAuthor && (
              <Button
                onClick={() => onJoinWorkspace(postId)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                워크스페이스 입장
              </Button>
            )}

            {isLoggedIn && !isAuthor && (
              <>
                {/* TODO: 동행 신청 상태(hasApplied, isAccepted) API 연동 필요 */}
                {!hasApplied && !isAccepted && (
                  <Button onClick={handleApply} className="w-full bg-blue-600 hover:bg-blue-700">
                    동행 신청하기
                  </Button>
                )}
                {hasApplied && !isAccepted && (
                  <Button disabled className="w-full bg-gray-400">
                    신청 대기중
                  </Button>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
