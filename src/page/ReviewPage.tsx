import { useState } from 'react';
import { Star, ArrowRight, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface ReviewPageProps {
  onComplete: () => void;
}

const MOCK_COMPANIONS = [
  { id: 1, name: '바다조아', avatar: '' },
  { id: 2, name: '제주사랑', avatar: '' },
];

export function ReviewPage({ onComplete }: ReviewPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<
    Record<number, { rating: number; feedback: string }>
  >({});

  const currentCompanion = MOCK_COMPANIONS[currentIndex];
  const currentReview = reviews[currentCompanion.id] || {
    rating: 0,
    feedback: '',
  };

  const handleRatingClick = (rating: number) => {
    setReviews((prev) => ({
      ...prev,
      [currentCompanion.id]: {
        ...prev[currentCompanion.id],
        rating,
      },
    }));
  };

  const handleFeedbackChange = (feedback: string) => {
    setReviews((prev) => ({
      ...prev,
      [currentCompanion.id]: {
        ...prev[currentCompanion.id],
        feedback,
      },
    }));
  };

  const handleNext = () => {
    if (currentIndex < MOCK_COMPANIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = () => {
    console.log('Reviews submitted:', reviews);
    onComplete();
  };

  const isLastCompanion = currentIndex === MOCK_COMPANIONS.length - 1;
  const progress = ((currentIndex + 1) / MOCK_COMPANIONS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">여행 리뷰 작성</h2>
          <p className="text-gray-600 mb-4">
            함께한 동행에게 솔직한 리뷰를 남겨주세요
          </p>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">
            {currentIndex + 1} / {MOCK_COMPANIONS.length}
          </p>
        </div>

        {/* Current Companion */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">{currentCompanion.name}</h3>
          <p className="text-sm text-gray-600">
            이 동행과의 여행은 어떠셨나요?
          </p>
        </div>

        {/* Rating */}
        <div className="mb-8">
          <Label className="mb-4 block text-center">평점을 선택해주세요</Label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleRatingClick(rating)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    rating <= currentReview.rating
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {currentReview.rating > 0 && (
            <p className="text-center text-sm text-gray-600 mt-2">
              {currentReview.rating === 5 && '최고예요! ⭐'}
              {currentReview.rating === 4 && '좋아요! 😊'}
              {currentReview.rating === 3 && '괜찮아요'}
              {currentReview.rating === 2 && '별로예요'}
              {currentReview.rating === 1 && '아쉬워요'}
            </p>
          )}
        </div>

        {/* Feedback */}
        <div className="mb-8">
          <Label htmlFor="feedback" className="mb-2">
            좋았거나 아쉬웠던 점을 적어주세요
          </Label>
          <Textarea
            id="feedback"
            placeholder="동행과 함께한 여행에서 좋았던 점이나 아쉬웠던 점을 자유롭게 작성해주세요."
            value={currentReview.feedback}
            onChange={(e) => handleFeedbackChange(e.target.value)}
            className="min-h-32 mt-2"
          />
          <p className="text-xs text-gray-500 mt-2">
            * 작성하신 리뷰는 해당 사용자의 프로필에 공개됩니다.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isLastCompanion ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleNext}
                disabled={currentReview.rating === 0}
              >
                건너뛰기
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={handleNext}
                disabled={currentReview.rating === 0}
              >
                다음
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 gap-2"
              onClick={handleSubmit}
              disabled={currentReview.rating === 0}
            >
              <Check className="w-4 h-4" />
              제출 완료
            </Button>
          )}
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {MOCK_COMPANIONS.map((companion, index) => (
            <div
              key={companion.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600'
                  : index < currentIndex
                    ? 'bg-green-600'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
