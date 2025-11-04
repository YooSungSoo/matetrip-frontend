import { useState, type FormEvent } from 'react';
import { X, Calendar, MapPin, Users, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';

interface CreatePostModalProps {
  onClose: () => void;
}

interface PostData {
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  location: string;
  maxParticipants: number;
  keywords: string[];
}

const KEYWORD_OPTIONS = [
  { key: 'FOOD', label: '음식' },
  { key: 'ACCOMMODATION', label: '숙박' },
  { key: 'ACTIVITY', label: '액티비티' },
  { key: 'TRANSPORT', label: '교통' },
];

/**
 * 동행 모집 게시글을 생성하는 API를 호출
 * @param postData 게시글 데이터
 */
async function createPost(postData: PostData) {
  // HttpOnly 쿠키 인증을 위해 기존 fetch 대신 client(axios instance)를 사용합니다.
  // withCredentials: true 설정 덕분에 쿠키가 자동으로 요청에 포함됩니다.
  const response = await client.post('/post', postData);
  return response.data;
}

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { user } = useAuthStore(); // Zustand 스토어에서 사용자 정보를 가져옵니다.
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    startDate: '',
    endDate: '',
    location: '',
    maxParticipants: 2,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('로그인이 필요합니다. 다시 로그인해주세요.');
      // 필요하다면 로그인 페이지로 리디렉션할 수 있습니다.
      return;
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      alert('종료일은 시작일보다 이후여야 합니다.');
      return;
    }

    setIsLoading(true);
    const postData: PostData = {
      ...formData,
      keywords: selectedKeywords,
    };

    console.log(postData);

    try {
      await createPost(postData);
      alert('동행 모집 게시글이 작성되었습니다.');
      onClose(); // 성공 시 모달 닫기
    } catch (error) {
      console.error('Error creating post:', error);
      alert(
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="text-gray-900">게시물 작성</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          id="create-post-form"
          onSubmit={handleSubmit}
          className="p-6 space-y-6"
        >
          {/* Title */}
          <div>
            <Label htmlFor="title">여행 제목</Label>
            <Input
              id="title"
              placeholder="예) 제주도 힐링 여행 같이 가실 분 🌊"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className="mt-2"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">상세 설명</Label>
            <Textarea
              id="description"
              placeholder="여행 계획과 동행에게 바라는 점을 자유롭게 작성해주세요."
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              className="mt-2 min-h-32"
              required
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                시작일
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                종료일
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              여행지
            </Label>
            <Input
              id="location"
              placeholder="예) 제주도"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              className="mt-2"
              required
            />
          </div>

          {/* Max Participants */}
          <div>
            <Label
              htmlFor="maxParticipants"
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              최대 인원 (본인 포함)
            </Label>
            <Input
              id="maxParticipants"
              type="number"
              min="2"
              max="10"
              value={formData.maxParticipants}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxParticipants: parseInt(e.target.value),
                }))
              }
              className="mt-2"
              required
            />
          </div>

          {/* Keywords */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" />
              여행 키워드
            </Label>
            <div className="flex flex-wrap gap-2">
              {KEYWORD_OPTIONS.map((option) => (
                <Badge
                  key={option.key}
                  variant={
                    selectedKeywords.includes(option.key)
                      ? 'default'
                      : 'outline'
                  }
                  className={`cursor-pointer transition-colors ${
                    selectedKeywords.includes(option.key)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleKeyword(option.key)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            type="submit"
            form="create-post-form"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? '작성 중...' : '작성 완료'}
          </Button>
        </div>
      </div>
    </div>
  );
}
