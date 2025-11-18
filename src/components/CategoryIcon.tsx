import React from 'react';

interface CategoryIconProps extends React.SVGProps<SVGSVGElement> {
  category: string | undefined;
  className?: string;
}

export const CategoryIcon = ({
  category,
  className,
  ...props
}: CategoryIconProps) => {
  let iconContent: React.ReactNode = null;

  switch (category) {
    case '레포츠':
      iconContent = (
        <>
          {/* 자전거 바퀴 */}
          <circle cx="-4" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* 프레임 */}
          <path
            d="M-4,4 L0,-2 L4,4 M0,-2 L0,1"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 핸들 */}
          <path d="M-1,-2 L1,-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case '추천코스':
      iconContent = (
        <path
          d="M0,-6 L1.5,-2 L6,-2 L2.5,1 L4,6 L0,3 L-4,6 L-2.5,1 L-6,-2 L-1.5,-2 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
        />
      );
      break;
    case '인문(문화/예술/역사)':
      iconContent = (
        <>
          <path d="M-7,-4 L0,-7 L7,-4 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" />
          <rect x="-6" y="-3" width="2" height="8" fill="currentColor" />
          <rect x="-1" y="-3" width="2" height="8" fill="currentColor" />
          <rect x="4" y="-3" width="2" height="8" fill="currentColor" />
          <rect x="-7" y="5" width="14" height="1" fill="currentColor" />
        </>
      );
      break;
    case '자연':
      iconContent = (
        <>
          <circle cx="0" cy="-3" r="4" fill="currentColor" />
          <circle cx="-3" cy="-1" r="3" fill="currentColor" />
          <circle cx="3" cy="-1" r="3" fill="currentColor" />
          <rect x="-1" y="1" width="2" height="5" fill="currentColor" />
        </>
      );
      break;
    case '숙박':
      iconContent = (
        <>
          <rect x="-7" y="-4" width="2" height="6" fill="currentColor" rx="0.5" />
          <rect x="-5" y="0" width="10" height="3" fill="currentColor" rx="0.5" />
          <rect x="-4" y="-2" width="3" height="2" fill="currentColor" rx="0.5" />
          <rect x="-5" y="3" width="1.5" height="3" fill="currentColor" />
          <rect x="3.5" y="3" width="1.5" height="3" fill="currentColor" />
        </>
      );
      break;
    case '음식':
      iconContent = (
        <>
          {/* 포크 */}
          <path
            d="M-5,-6 L-5,-1 M-6.5,-6 L-6.5,-2 C-6.5,-1 -5.5,-1 -5,-1 M-3.5,-6 L-3.5,-2 C-3.5,-1 -4.5,-1 -5,-1 M-5,-1 L-5,6"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 나이프 */}
          <path
            d="M3,-6 L3,6 M3,-6 L5,-5 L5,-3 L3,-2"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
      break;
    default:
      iconContent = <circle cx="0" cy="0" r="6" fill="currentColor" />;
  }

  return (
    <svg viewBox="-10 -10 20 20" className={className} {...props}>
      {iconContent}
    </svg>
  );
};
