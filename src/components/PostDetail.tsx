import { useState } from 'react';
import {
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
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Avatar } from './ui/avatar';

interface PostDetailProps {
  postId: number;
  isLoggedIn: boolean;
  onJoinWorkspace: (postId: number) => void;
  onEditPost: () => void;
}

// Mock data - 실제로는 postId로 데이터를 가져옴
const MOCK_POST = {
  id: 1,
  title: '제주도 힐링 여행 같이 가실 분 🌊',
  author: {
    id: 1,
    name: '여행러버',
    temp: 36.5,
    travelStyle: ['힐링', '자연', '맛집투어'],
  },
  image:
    'https://images.unsplash.com/photo-1614088459293-5669fadc3448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbnxlbnwxfHx8fDE3NjE4NjQwNzB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  date: '2025.11.15 - 11.18',
  location: '제주도',
  participants: 3,
  maxParticipants: 4,
  keywords: ['힐링', '자연', '맛집투어'],
  status: '모집중' as const,
  description: `제주도에서 여유롭게 힐링하면서 맛집도 탐방할 분들 구합니다!

성산일출봉, 우도, 협재 해수욕장 등을 둘러보고, 현지 맛집도 찾아다닐 예정입니다.
렌터카는 제가 빌릴 예정이고, 운전은 교대로 하면 좋을 것 같아요.

여유롭게 즐기실 분들 환영합니다! 😊`,
  currentMembers: [
    { id: 1, name: '여행러버', temp: 36.5, isAuthor: true },
    { id: 2, name: '바다조아', temp: 37.8, isAuthor: false },
    { id: 3, name: '제주사랑', temp: 38.0, isAuthor: false },
  ],
  pendingRequests: [
    { id: 4, name: '산악인', temp: 38.2, travelStyle: ['액티브', '등산'] },
    { id: 5, name: '카페러', temp: 37.2, travelStyle: ['카페', '사진'] },
  ],
};

export function PostDetail({
  postId,
  isLoggedIn,
  onJoinWorkspace,
  onEditPost,
}: PostDetailProps) {
  const [hasApplied, setHasApplied] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // 현재 사용자가 작성자인지 확인 (실제로는 로그인 정보와 비교)
  const isAuthor = true; // Mock

  const handleApply = () => {
    setHasApplied(true);
  };

  const handleAcceptRequest = (userId: number) => {
    console.log('Accept request from user:', userId);
  };

  const handleRejectRequest = (userId: number) => {
    console.log('Reject request from user:', userId);
  };

  const getTempColor = (temp: number) => {
    if (temp >= 38) return 'text-green-600';
    if (temp >= 37) return 'text-blue-600';
    return 'text-gray-600';
  };

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
              src={MOCK_POST.image}
              alt={MOCK_POST.title}
              className="w-full h-full object-cover"
            />
            <Badge
              className={`absolute top-4 right-4 ${
                MOCK_POST.status === '모집중' ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              {MOCK_POST.status}
            </Badge>
          </div>

          {/* Title and Author */}
          <div className="mb-6">
            <h1 className="text-gray-900 mb-4">{MOCK_POST.title}</h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                <div>
                  <div className="text-gray-900">{MOCK_POST.author.name}</div>
                  <div
                    className={`text-sm flex items-center gap-1 ${getTempColor(MOCK_POST.author.temp)}`}
                  >
                    <Thermometer className="w-4 h-4" />
                    매너온도 {MOCK_POST.author.temp}°C
                  </div>
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
              {MOCK_POST.author.travelStyle.map((style) => (
                <Badge key={style} variant="secondary">
                  {style}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-4">여행 소개</h3>
            <p className="text-gray-700 whitespace-pre-line">
              {MOCK_POST.description}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Current Members */}
          <div>
            <h3 className="text-gray-900 mb-4">
              참여중인 동행 ({MOCK_POST.currentMembers.length}명)
            </h3>
            <div className="space-y-3">
              {MOCK_POST.currentMembers.map((member) => (
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
              ))}
            </div>
          </div>

          {/* Pending Requests (Author Only) */}
          {isAuthor && MOCK_POST.pendingRequests.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-gray-900 mb-4">
                  동행 신청 ({MOCK_POST.pendingRequests.length}명)
                </h3>
                <div className="space-y-3">
                  {MOCK_POST.pendingRequests.map((request) => (
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
                  ))}
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
                  <div>{MOCK_POST.date}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">여행지</div>
                  <div>{MOCK_POST.location}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">모집 인원</div>
                  <div>
                    {MOCK_POST.participants} / {MOCK_POST.maxParticipants}명
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">여행 키워드</div>
              <div className="flex flex-wrap gap-2">
                {MOCK_POST.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {isLoggedIn && !isAuthor && (
              <>
                {!hasApplied && !isAccepted && (
                  <Button
                    onClick={handleApply}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    동행 신청하기
                  </Button>
                )}

                {hasApplied && !isAccepted && (
                  <Button disabled className="w-full bg-gray-400">
                    신청 대기중
                  </Button>
                )}

                {isAccepted && (
                  <Button
                    onClick={() => onJoinWorkspace(postId)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    워크스페이스 입장
                  </Button>
                )}
              </>
            )}

            {/* {isAuthor && (
              <Button
                onClick={() => onJoinWorkspace(postId)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                워크스페이스 입장
              </Button>
            )}

            {!isLoggedIn && (
              <Button disabled className="w-full">
                로그인 후 신청 가능
              </Button>
            )} */}
            {isLoggedIn ? (
              <Button
                onClick={() => onJoinWorkspace(postId)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                워크스페이스 입장
              </Button>
            ) : (
              <Button disabled className="w-full">
                로그인 후 신청 가능
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
