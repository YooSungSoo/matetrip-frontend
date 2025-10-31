import { useState } from 'react';
import { Send, Paperclip, Sparkles, MessageSquare, StickyNote, Users } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

interface Message {
  id: number;
  user: string;
  content: string;
  time: string;
  isAI?: boolean;
  isMe?: boolean;
}

const MOCK_MESSAGES: Message[] = [
  { id: 1, user: '바다조아', content: '안녕하세요! 부산 여행 기대되네요 😊', time: '10:30', isMe: false },
  { id: 2, user: '나', content: '저도요! 해운대 일출 보러 가실 분?', time: '10:32', isMe: true },
  { id: 3, user: 'AI 여행 비서', content: '해운대 일출은 오전 6시 30분경이 가장 아름답습니다. 근처 카페 추천해드릴까요?', time: '10:33', isAI: true },
  { id: 4, user: '여행러버', content: '좋아요! 카페 추천 부탁드려요', time: '10:35', isMe: false },
];

const MOCK_NOTES = [
  { id: 1, title: '준비물 체크리스트', content: '선크림, 모자, 수영복, 카메라, 보조배터리', author: '바다조아', time: '어제' },
  { id: 2, title: '맛집 리스트', content: '1. 해운대 횟집 ₩₩₩\n2. 광안리 카페 ₩₩\n3. 부산 돼지국밥 ₩', author: '여행러버', time: '2일 전' },
];

export function ChatPanel() {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle send message
      setMessage('');
    }
  };

  return (
    <div className="h-full bg-white border-l flex flex-col">
      {/* Header with Tabs */}
      <div className="border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full rounded-none h-14 bg-gray-50">
            <TabsTrigger value="chat" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" />
              채팅
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-2">
              <StickyNote className="w-4 h-4" />
              메모
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 gap-2">
              <Users className="w-4 h-4" />
              참여자
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {MOCK_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${msg.isMe ? 'order-2' : ''}`}>
                    {!msg.isMe && (
                      <div className="flex items-center gap-2 mb-1">
                        {msg.isAI ? (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                        )}
                        <span className="text-xs text-gray-600">{msg.user}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        msg.isMe
                          ? 'bg-blue-600 text-white'
                          : msg.isAI
                          ? 'bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900 border border-blue-200'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${msg.isMe ? 'text-right' : ''}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="shrink-0">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="메시지를 입력하세요..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  className="shrink-0 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3 mb-4">
              {MOCK_NOTES.map((note) => (
                <div key={note.id} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h4 className="text-gray-900 text-sm mb-2">{note.title}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{note.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{note.author}</span>
                    <span>{note.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full border-dashed">
              <Plus className="w-4 h-4 mr-2" />
              새 메모 추가
            </Button>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {[
                { name: '바다조아', role: '방장', online: true, temp: 37.8 },
                { name: '여행러버', role: '멤버', online: true, temp: 36.5 },
                { name: '산악인', role: '멤버', online: false, temp: 38.2 },
              ].map((member, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    {member.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{member.name}</span>
                      {member.role === '방장' && (
                        <Badge variant="secondary" className="text-xs h-5">방장</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">매너온도 {member.temp}°C</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
