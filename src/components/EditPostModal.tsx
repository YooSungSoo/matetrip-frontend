import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface EditPostModalProps {
  postId: string;
  onClose: () => void;
}

interface PostData {
  title: string;
  description: string;
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

// 실제 API 연동 전 사용할 예시 데이터
const MOCK_POST_DATA: PostData = {
  title: '제주도 미식 여행 동행 구해요!',
  description:
    '제주도 맛집이란 맛집은 다 가볼 예정입니다. 같이 맛있는 거 먹으면서 즐겁게 여행하실 분 찾습니다. 숙소는 아직 미정이고 같이 상의해서 정해요!',
  startDate: '2025-12-01',
  endDate: '2025-12-04',
  location: '제주도',
  maxParticipants: 3,
  keywords: ['음식', '숙박'], // KEYWORD_OPTIONS에 있는 값으로 설정
};

export function EditPostModal({ postId, onClose }: EditPostModalProps) {
  // postId는 실제 API 연동 시 사용됩니다. 지금은 MOCK_POST_DATA를 사용합니다.
  console.log(`수정할 게시물 ID: ${postId}`);

  const [formData, setFormData] =
    useState<Omit<PostData, 'keywords'>>(MOCK_POST_DATA);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>(
    MOCK_POST_DATA.keywords
  );

  const toggleKeyword = (keywordLabel: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keywordLabel)
        ? prev.filter((k) => k !== keywordLabel)
        : [...prev, keywordLabel]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPostData = { ...formData, keywords: selectedKeywords };
    // TODO: 실제 API 연동 시 아래 console.log 대신 updatePost 함수를 호출합니다.
    console.log('수정된 게시물 데이터:', updatedPostData);
    alert('콘솔을 확인하세요. 게시물 수정 데이터가 기록되었습니다.');
    onClose(); // 성공 시 모달 닫기
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="text-gray-900">게시물 수정</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">여행 제목</Label>
            <Input
              id="title"
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
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
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
              {KEYWORD_OPTIONS.map((keyword) => (
                <Badge
                  key={keyword.key}
                  variant={
                    selectedKeywords.includes(keyword.label)
                      ? 'default'
                      : 'outline'
                  }
                  className={`cursor-pointer transition-colors ${
                    selectedKeywords.includes(keyword.label)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleKeyword(keyword.label)}
                >
                  {keyword.label}
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
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            수정 완료
          </Button>
        </div>
      </div>
    </div>
  );
}
