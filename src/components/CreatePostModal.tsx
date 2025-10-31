import { useState } from 'react';
import { X, Calendar, MapPin, Users, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';

interface CreatePostModalProps {
  onClose: () => void;
}

const KEYWORD_OPTIONS = ['힐링', '액티브', '맛집투어', '사진', '자연', '도시', '해변', '산', '카페', '쇼핑'];

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h3 className="text-gray-900">새 여행 만들기</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">여행 제목</Label>
            <Input
              id="title"
              placeholder="예: 제주도 힐링 여행 같이 가실 분 🌊"
              className="mt-2"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">상세 설명</Label>
            <Textarea
              id="description"
              placeholder="여행에 대해 자세히 설명해주세요..."
              className="mt-2 min-h-32"
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
                className="mt-2"
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
                className="mt-2"
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
              placeholder="예: 제주도"
              className="mt-2"
            />
          </div>

          {/* Max Participants */}
          <div>
            <Label htmlFor="maxParticipants" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              최대 인원 (본인 포함)
            </Label>
            <Input
              id="maxParticipants"
              type="number"
              min="2"
              max="10"
              defaultValue="4"
              className="mt-2"
            />
          </div>

          {/* Keywords */}
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" />
              여행 키워드 (최대 3개)
            </Label>
            <div className="flex flex-wrap gap-2">
              {KEYWORD_OPTIONS.map((keyword) => (
                <Badge
                  key={keyword}
                  variant={selectedKeywords.includes(keyword) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    selectedKeywords.includes(keyword)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => toggleKeyword(keyword)}
                >
                  {keyword}
                </Badge>
              ))}
            </div>
            {selectedKeywords.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                선택됨: {selectedKeywords.join(', ')}
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div>
            <Label htmlFor="image">대표 이미지</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <div className="text-gray-600">
                <div className="mb-2">📷</div>
                <div>이미지를 업로드하거나 드래그하세요</div>
                <div className="text-sm text-gray-400 mt-1">JPG, PNG (최대 5MB)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
            여행 만들기
          </Button>
        </div>
      </div>
    </div>
  );
}
