import { useState, useEffect, useRef } from 'react';

/**
 * isVisible 상태에 따라 opacity 값을 부드럽게 전환하는 커스텀 훅
 * @param isVisible - 컴포넌트의 가시성 여부
 * @param duration - 애니메이션 지속 시간 (ms)
 * @returns 0과 1 사이의 opacity 값
 */
export const useAnimatedOpacity = (isVisible: boolean, duration = 300) => {
  const [opacity, setOpacity] = useState(isVisible ? 1 : 0);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const startValue = opacity;
    const targetValue = isVisible ? 1 : 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      const currentValue = startValue + (targetValue - startValue) * progress;
      setOpacity(currentValue);

      if (progress < 1) {
        animationFrameId.current = requestAnimationFrame(animate);
      }
    };

    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isVisible, duration]); // opacity를 의존성 배열에서 제거

  return opacity;
};
