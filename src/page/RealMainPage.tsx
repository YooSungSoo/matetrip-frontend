import { ChevronDown, MapPin, Clock, Star, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

// 이미지 import
import AIMatching01 from '../image/AIMatching01.jpg';
import AIMatching02 from '../image/AIMatching02.jpg';
import AIMatching03 from '../image/AIMatching03.jpg';
import AIMatching04 from '../image/AIMatching04.jpg';
import AIMatching05 from '../image/AIMatching05.jpg';
import AIMatching06 from '../image/AIMatching06.png';
import AIPlace01 from '../image/AIPlace01.jpg';
import AIPlace02 from '../image/AIPlace02.png';
import AIPlace03 from '../image/AIPlace03.png';
import AIPlace04 from '../image/AIPlace04.png';
import HeroSection from '../image/HeroSection.png';

// 리뷰 데이터
const reviews = [
  {
    name: 'Michael R.',
    image: AIMatching01,
    text: '한국 여행 중 새로운 사람을 만날 조용하고 멋진 장소 찾기가 쉽지 않았어요. 이 서비스를 통해 멋진 동반자를 만나고 추천받은 카페의 아늑한 테이블이 정말 좋았어요.',
  },
  {
    name: 'Sarah K.',
    image: AIMatching02,
    text: '서울에서 새로운 사람을 만날 조용하고 세련된 장소를 찾는 건 쉽지 않아요. 이 서비스 덕분에 멋진 사람과 연결됐고, 강남의 아늑한 카페를 추천받았어요.',
  },
  {
    name: 'James L.',
    image: AIMatching03,
    text: '한국에서 새로운 친구를 만나기 좋은 조용하고 세련된 장소를 찾는 게 쉽지 않아요. 이 서비스 덕분에 멋진 사람과 연결되었고, 약국 홀의 아늑한 테이블을 추천받았어요!',
  },
  {
    name: 'Emma W.',
    image: AIMatching04,
    text: '서울에서 새로운 사람을 만날 조용하고 세련된 장소를 찾는 건 어려운 일이에요. 이 서비스 덕분에 멋진 사람과 매칭됐고, 강남의 완벽한 테이블을 추천받았어요.',
  },
  {
    name: 'Daniel P.',
    image: AIMatching05,
    text: '서울에서 새로운 사람과 만날 조용하고 우아한 장소를 찾는 건 쉽지 않아요. 이 서비스 덕분에 훌륭한 사람과 연결됐고, 이태원의 아늑한 테이블을 추천받았어요.',
  },
];

// 장소 이미지 배열 (AI 매칭 캐러셀용)
const placeImages = [
  AIMatching01,
  AIMatching02,
  AIMatching03,
  AIMatching04,
  AIMatching05,
  AIMatching06,
];

export default function RealMainPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const { isLoggedIn, logout } = useAuthStore();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // 히어로 섹션 높이(1100px)를 지나면 헤더 색상 변경
      setIsScrolled(window.scrollY > 1000);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStart = () => {
    if (isLoggedIn) {
      navigate('/main');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 조절
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="bg-white flex flex-col items-start relative w-full min-h-screen">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-2 border-b backdrop-blur-sm transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 border-gray-300'
            : 'bg-transparent border-gray-300/50'
        }`}
      >
        <div className="flex gap-12 items-center">
          <h1
            className={`font-bold text-4xl transition-colors duration-300 ${
              isScrolled ? 'text-black' : 'text-white'
            }`}
          >
            MateTrip
          </h1>
          <nav className="flex gap-6 items-center">
            <button
              className={`p-2.5 text-xl font-medium transition-colors duration-300 ${
                isScrolled
                  ? 'text-black hover:opacity-80'
                  : 'text-white hover:opacity-80'
              }`}
            >
              서비스 소개
            </button>
            <button
              className={`p-2.5 text-xl font-medium transition-colors duration-300 ${
                isScrolled
                  ? 'text-black/60 hover:text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Hot Place
            </button>
          </nav>
        </div>
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className={`border rounded-xl px-6 py-2 text-base font-medium transition-colors duration-300 ${
              isScrolled
                ? 'border-black/60 text-black hover:bg-black/10'
                : 'border-white/60 text-white hover:bg-white/10'
            }`}
          >
            로그아웃
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className={`border rounded-xl px-6 py-2 text-base font-medium transition-colors duration-300 ${
              isScrolled
                ? 'border-black/60 text-black hover:bg-black/10'
                : 'border-white/60 text-white hover:bg-white/10'
            }`}
          >
            로그인
          </button>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative w-full h-[1100px] overflow-hidden">
        <img
          src={HeroSection}
          alt="Hero background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <div className="flex flex-col gap-9 items-center max-w-[851px]">
            {/* Badge */}
            <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-1.5 flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              <span className="text-xs font-medium tracking-wider uppercase">
                다양한 사람들과의 만남을 즐겨보세요!
              </span>
            </div>

            {/* Main Text */}
            <div className="flex flex-col gap-4 items-center text-center">
              <h2 className="text-5xl font-bold">Mate Trip에서 000하세요.</h2>
              <p className="text-xl font-medium leading-relaxed max-w-[570px] opacity-90">
                Mate Trip은 당신과 함께할 여행 동반자를 찾아드립니다.
                <br />
                동반자와 함께 지금 당장 여행을 떠나세요.
              </p>
            </div>

            {/* Sub Info */}
            <div className="flex gap-10 items-center text-white/80">
              <div className="flex gap-3 items-center">
                <MapPin className="w-4 h-4" />
                <span className="text-sm uppercase tracking-wide">
                  트베르스코이 대로에서의 멋진 하루
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <Clock className="w-4 h-4" />
                <span className="text-sm uppercase tracking-wide">
                  24시간 언제든지 함께하는 여행!
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Discover - 히어로 섹션 하단 */}
        <div className="absolute bottom-36 left-0 right-0 flex flex-col items-center gap-1 opacity-70">
          <span className="text-xs tracking-wider uppercase text-white">
            Discover
          </span>
          <ChevronDown className="w-5 h-5 text-white animate-bounce" />
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] h-28 flex flex-col items-center justify-center">
          <button
            onClick={handleGetStart}
            className="border border-gray-300 rounded-full px-8 py-2 font-bold text-xl text-gray-900 hover:bg-gray-200 transition-colors"
          >
            GET START
          </button>
        </div>
      </section>

      {/* AI Matching Section */}
      <section className="w-full bg-white my-24 flex flex-col gap-12">
        {/* Title */}
        <div className="flex flex-col gap-6 items-center max-w-[922px] text-center mx-auto mb-10">
          <span className="border border-black/20 rounded-xl px-8 py-2 text-sm font-medium">
            AI 매칭추천
          </span>
          <h3 className="text-4xl font-bold text-black">완벽한 동행자 찾기</h3>
          <p className="text-sm font-medium text-black leading-relaxed">
            우리의 매칭 서비스는 AI를 활용해 유저의 성향에 딱 맞는 여행 동반자를
            찾아줍니다. 현재 많은 이용자들이 매칭을 기다리고 있으니, 당신도 함께
            여행할 친구를 찾아보세요!
          </p>
        </div>

        {/* Stats + Images Row */}
        <div className="flex gap-24 px-12">
          {/* Stats - Left Side */}
          <div className="flex flex-col gap-6 w-[480px] flex-shrink-0">
            <div className="">
              <h4 className="text-2xl block font-bold">
                AI가 <span className="text-primary">완벽한 당신의 메이트</span>
                를 추천합니다.
              </h4>
              <p className="text-sm mt-4">
                단순한 매칭이 아닙니다. Mate Trip의 독자적인 AI 알고리즘이
                당신의 여행 스타일, 취향, 성격을 정밀 분석하여 가장 이상적인
                동행자를 제안합니다.
              </p>
            </div>
            <div className="bg-white border border-black/10 rounded-xl p-7 h-[112px] flex flex-col justify-center relative">
              <span className="text-3xl font-medium text-gray-900">
                15,000명 이상
              </span>
              <span className="text-sm font-medium text-gray-500">
                이번 달 성공적인 매치 수
              </span>
              <span className="absolute top-8 right-5 text-2xl text-gray-400">
                +
              </span>
            </div>
          </div>

          {/* Images - Right Side */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{
              userSelect: 'none',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {placeImages.map((img, index) => (
              <div
                key={index}
                className="h-[426px] w-[380px] rounded-lg overflow-hidden flex-shrink-0"
              >
                <img
                  src={img}
                  alt={`Place ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Marquee Text */}
        <div className="w-full overflow-hidden mt-2">
          <div
            className="inline-flex whitespace-nowrap"
            style={{
              animation: 'marquee 20s linear infinite',
            }}
          >
            <span className="text-[120px] font-medium text-gray-900/20 mx-8">
              MATE TRIP IS ALWAYS HERE WAITING FOR YOU.
            </span>
            <span className="text-[120px] font-medium text-gray-900/20 mx-8">
              MATE TRIP IS ALWAYS HERE WAITING FOR YOU.
            </span>
          </div>
        </div>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </section>

      {/* AI Place Recommendation Section */}
      <section className="w-full bg-gray-50/10 px-12 py-20 flex flex-col gap-14">
        <div className="flex flex-col gap-4 items-center text-center">
          <span className="border border-black/20 rounded-xl px-8 py-2 text-sm font-medium">
            AI 장소추천
          </span>
          <h3 className="text-4xl font-bold text-gray-900">완벽한 공간 찾기</h3>
          <p className="text-base font-medium text-gray-500 max-w-[619px] leading-relaxed">
            당신의 기분에 맞는 다양한 독특한 분위기를 제공합니다. 웅장한 홀부터
            아늑한 코너까지, 당신의 연결을 위한 완벽한 배경을 발견하세요.
          </p>
        </div>

        {/* Places Grid */}
        <div className="flex gap-0 items-stretch w-full ">
          {[
            {
              img: AIPlace01,
              name: '서울시 남산공원',
              description:
                '서울 남산공원은 아름다운 자연과 도시의 경관이 어우러진 곳으로, 산책과 피크닉에 최적입니다. 특히, 연인과 함께하는 데이트 장소로 인기가 높으며, 서울타워에서의 전망은 잊지 못할 경험을 선사합니다.',
            },
            {
              img: AIPlace02,
              name: '정동진 해변',
              description:
                '서울 남산공원은 아름다운 자연과 도시의 경관이 어우러진 곳으로, 산책과 피크닉에 최적입니다. 특히, 연인과 함께하는 데이트 장소로 인기가 높으며, 서울타워에서의 전망은 잊지 못할 경험을 선사합니다.',
            },
            {
              img: AIPlace03,
              name: '스위스 마을',
              description:
                '서울 남산공원은 아름다운 자연과 도시의 경관이 어우러진 곳으로, 산책과 피크닉에 최적입니다. 특히, 연인과 함께하는 데이트 장소로 인기가 높으며, 서울타워에서의 전망은 잊지 못할 경험을 선사합니다.',
            },
            {
              img: AIPlace04,
              name: '제주도 우도',
              description:
                '서울 남산공원은 아름다운 자연과 도시의 경관이 어우러진 곳으로, 산책과 피크닉에 최적입니다. 특히, 연인과 함께하는 데이트 장소로 인기가 높으며, 서울타워에서의 전망은 잊지 못할 경험을 선사합니다.',
            },
          ].map((place, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col gap-4 transition-all duration-300 hover:flex-[3] cursor-pointer group"
            >
              <div className="w-full h-[418px] rounded-lg overflow-hidden">
                <img
                  src={place.img}
                  alt={place.name}
                  className="w-full h-full object-cover block"
                />
              </div>
              <div className="px-3">
                <div className="flex items-center gap-1">
                  <h4 className="text-xl font-bold text-neutral-950">
                    {place.name}
                  </h4>
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </div>
                {place.description && (
                  <p className="text-sm font-medium text-gray-500 mt-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {place.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full bg-white py-20 px-12 overflow-hidden">
        <div className="flex flex-col gap-4 items-center text-center mb-12">
          <span className="border border-black/20 rounded-lg px-4 py-1 text-xs font-medium">
            Review
          </span>
          <h3 className="text-4xl font-bold text-gray-900">고객의 이야기</h3>
          <p className="text-sm font-medium text-gray-500 max-w-[608px]">
            진정한 연결, 진정한 이야기. 우리 커뮤니티가 완벽한 짝을 찾은 경험에
            대해 어떻게 이야기하는지 확인해보세요.
          </p>
        </div>

        {/* Review Cards - Row 1 (왼쪽 → 오른쪽) */}
        <div className="overflow-hidden mb-10">
          <div
            className="flex gap-14 whitespace-nowrap"
            style={{ animation: 'marqueeLeft 30s linear infinite' }}
          >
            {[...reviews, ...reviews].map((review, index) => (
              <ReviewCard key={`row1-${index}`} review={review} />
            ))}
          </div>
        </div>

        {/* Review Cards - Row 2 (오른쪽 → 왼쪽) */}
        <div className="overflow-hidden mb-10">
          <div
            className="flex gap-14 whitespace-nowrap"
            style={{ animation: 'marqueeRight 30s linear infinite' }}
          >
            {[...reviews, ...reviews].map((review, index) => (
              <ReviewCard key={`row2-${index}`} review={review} />
            ))}
          </div>
        </div>

        {/* Review Cards - Row 3 (왼쪽 → 오른쪽) */}
        <div className="overflow-hidden">
          <div
            className="flex gap-14 whitespace-nowrap"
            style={{ animation: 'marqueeLeft 30s linear infinite' }}
          >
            {[...reviews, ...reviews].map((review, index) => (
              <ReviewCard key={`row3-${index}`} review={review} />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes marqueeLeft {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          @keyframes marqueeRight {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
        `}</style>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 h-96" />
    </div>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: (typeof reviews)[0] }) {
  return (
    <div className="relative pt-[17px] pl-[11px]">
      {/* 프로필 이미지 - 왼쪽 상단 */}
      <img
        src={review.image}
        alt={review.name}
        className="absolute top-0 left-0 w-14 h-14 rounded-full object-cover shadow-md z-10"
      />
      {/* 카드 본체 */}
      <div className="bg-white rounded-xl shadow-[0px_10px_15px_-10px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] w-[558px] h-[136px] relative overflow-hidden">
        {/* 닫는 따옴표 아이콘 */}
        <Quote className="absolute top-2 right-2 w-7 h-7 text-gray-300 rotate-180" />
        {/* 내용 영역 */}
        <div className="absolute left-[34px] top-[22px] flex items-start gap-5">
          {/* 이름 + 별점 */}
          <div className="flex flex-col items-center w-[84px]">
            <span
              className="text-[15.75px] text-neutral-950 text-center"
              style={{ fontFamily: 'Tinos, serif' }}
            >
              {review.name}
            </span>
            <div className="flex gap-[3.5px] mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
          </div>
          {/* 리뷰 텍스트 */}
          <p className="text-sm font-light italic text-[#717182] text-center w-[378px] leading-[22.75px] tracking-[-0.15px]">
            "{review.text}"
          </p>
        </div>
      </div>
    </div>
  );
}
