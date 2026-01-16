import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API = {
  auth: 'https://functions.poehali.dev/6639f3c0-0a9a-4c32-a527-114854560ab8',
  shop: 'https://functions.poehali.dev/235f1e44-6673-41f0-a4be-523585301f01',
  posts: 'https://functions.poehali.dev/e3a43d92-c791-49eb-bf4e-5c207a568956',
  stories: 'https://functions.poehali.dev/109d453c-1249-4e81-bba6-5d5d78cdad9d',
  channels: 'https://functions.poehali.dev/49ac942f-6c38-4424-a77c-3c52af77c5a2'
};

const PREMIUM_EMOJIS = ['🔥', '💎', '⭐', '✨', '🎉', '💫', '🌟', '👑', '🎯', '💯', '🚀', '🦄', '🌈', '💖', '🎨'];
const RAINBOW_THEMES = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  yn_balance: number;
  is_premium: boolean;
  is_verified: boolean;
  verification_color?: string;
  custom_theme?: string;
  premium_emoji_enabled?: boolean;
  super_likes_count?: number;
  boost_active_until?: string;
}

interface Post {
  id: number;
  content: string;
  media_url?: string;
  media_type?: string;
  channel_id?: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_boosted?: boolean;
  author: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified: boolean;
    verification_color?: string;
    is_premium?: boolean;
  };
}

interface Comment {
  id: number;
  content: string;
  likes_count: number;
  created_at: string;
  author: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified: boolean;
    verification_color?: string;
  };
}

interface Story {
  user: {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_verified: boolean;
    verification_color?: string;
  };
  stories: Array<{
    id: number;
    media_url: string;
    media_type: string;
    views_count: number;
    created_at: string;
    expires_at: string;
  }>;
}

interface Channel {
  id: number;
  name: string;
  description: string;
  avatar_url?: string;
  subscribers_count: number;
  is_private: boolean;
  owner: {
    id: number;
    username: string;
    display_name: string;
    is_verified: boolean;
    verification_color?: string;
  };
}

interface ShopItem {
  id: string;
  title: string;
  description: string;
  price: number;
  icon: string;
  category: 'premium' | 'bonus';
  item_type: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState<string | null>(null);
  const [newPostMediaType, setNewPostMediaType] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showComments, setShowComments] = useState<number | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [profileTheme, setProfileTheme] = useState<string>('default');

  const shopItems: ShopItem[] = [
    {
      id: '1',
      title: 'Премиум аккаунт',
      description: 'Синяя галочка + все радужные темы профиля',
      price: 500,
      icon: 'Crown',
      category: 'premium',
      item_type: 'premium_account'
    },
    {
      id: '2',
      title: 'Верификация профиля',
      description: 'Красная галочка на вашем профиле',
      price: 300,
      icon: 'BadgeCheck',
      category: 'premium',
      item_type: 'verification'
    },
    {
      id: '3',
      title: 'Бустер видимости',
      description: 'Ваши посты на 24 часа в топе ленты',
      price: 150,
      icon: 'Zap',
      category: 'bonus',
      item_type: 'boost'
    },
    {
      id: '4',
      title: 'Кастомная тема',
      description: 'Красно-темная тема профиля',
      price: 200,
      icon: 'Palette',
      category: 'premium',
      item_type: 'custom_theme'
    },
    {
      id: '5',
      title: 'Супер-лайк',
      description: 'Пакет из 50 лайков (каждый считается за 3)',
      price: 100,
      icon: 'Heart',
      category: 'bonus',
      item_type: 'super_likes'
    },
    {
      id: '6',
      title: 'Премиум эмодзи',
      description: 'Эксклюзивные эмодзи для постов',
      price: 75,
      icon: 'Smile',
      category: 'bonus',
      item_type: 'premium_emoji'
    }
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('ynaut_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setShowAuth(false);
      setProfileTheme(parsedUser.custom_theme || 'default');
      loadPosts();
      loadStories();
      loadChannels();
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const loadPosts = async () => {
    try {
      const response = await fetch(API.posts);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadStories = async () => {
    try {
      const response = await fetch(API.stories);
      const data = await response.json();
      setStories(data.stories || []);
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await fetch(API.channels);
      const data = await response.json();
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadComments = async (postId: number) => {
    try {
      const response = await fetch(API.posts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_comments',
          post_id: postId
        })
      });
      const data = await response.json();
      setComments(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const email = authMode === 'register' ? (formData.get('email') as string) : '';
    const display_name = authMode === 'register' ? (formData.get('display_name') as string) : '';

    try {
      const response = await fetch(API.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username,
          password,
          email,
          display_name
        })
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('ynaut_user', JSON.stringify(data.user));
        setShowAuth(false);
        toast.success(authMode === 'register' ? 'Регистрация успешна!' : 'Добро пожаловать!');
        loadPosts();
        loadStories();
        loadChannels();
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostContent.trim()) return;

    try {
      const response = await fetch(API.posts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: user.id,
          content: newPostContent,
          media_data: newPostMedia,
          media_type: newPostMediaType,
          channel_id: selectedChannelId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Пост опубликован! +20 YN`);
        setUser({ ...user, yn_balance: data.new_balance });
        localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance }));
        setNewPostContent('');
        setNewPostMedia(null);
        setNewPostMediaType(null);
        setSelectedChannelId(null);
        loadPosts();
      }
    } catch (error) {
      toast.error('Ошибка создания поста');
    }
  };

  const handleLike = async (postId: number, useSuperLike = false) => {
    if (!user) return;

    if (useSuperLike && (!user.super_likes_count || user.super_likes_count <= 0)) {
      toast.error('Нет супер-лайков');
      return;
    }

    try {
      const response = await fetch(API.posts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'like',
          user_id: user.id,
          post_id: postId,
          use_super_like: useSuperLike
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.liked) {
          setLikedPosts([...likedPosts, postId]);
          if (useSuperLike) {
            toast.success('💎 Супер-лайк! (+5 YN)');
            setUser({ ...user, yn_balance: data.new_balance, super_likes_count: (user.super_likes_count || 0) - 1 });
            localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance, super_likes_count: (user.super_likes_count || 0) - 1 }));
          } else {
            toast.success('+ 5 YN за активность!');
            setUser({ ...user, yn_balance: data.new_balance });
            localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance }));
          }
        } else {
          setLikedPosts(likedPosts.filter(id => id !== postId));
        }
        loadPosts();
      }
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleComment = async (postId: number) => {
    if (!user || !newComment[postId]?.trim()) return;

    try {
      const response = await fetch(API.posts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          user_id: user.id,
          post_id: postId,
          content: newComment[postId]
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('+10 YN за комментарий!');
        setUser({ ...user, yn_balance: data.new_balance });
        localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance }));
        setNewComment({ ...newComment, [postId]: '' });
        loadComments(postId);
        loadPosts();
      }
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleCreateStory = async (file: File) => {
    if (!user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      
      try {
        const response = await fetch(API.stories, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            user_id: user.id,
            media_data: base64,
            media_type: file.type
          })
        });

        const data = await response.json();
        
        if (data.success) {
          toast.success('История опубликована! +15 YN');
          setUser({ ...user, yn_balance: data.new_balance });
          localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance }));
          loadStories();
        }
      } catch (error) {
        toast.error('Ошибка создания истории');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateChannel = async () => {
    if (!user || !newChannelName.trim()) return;

    try {
      const response = await fetch(API.channels, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user_id: user.id,
          name: newChannelName,
          description: newChannelDesc
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Канал создан! +50 YN');
        setUser({ ...user, yn_balance: data.new_balance });
        localStorage.setItem('ynaut_user', JSON.stringify({ ...user, yn_balance: data.new_balance }));
        setNewChannelName('');
        setNewChannelDesc('');
        setShowCreateChannel(false);
        loadChannels();
      }
    } catch (error) {
      toast.error('Ошибка создания канала');
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return;

    try {
      const response = await fetch(API.shop, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          item_type: item.item_type,
          item_name: item.title,
          price: item.price
        })
      });

      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success) {
        toast.success(data.message);
        const updatedUser = { ...user, yn_balance: data.new_balance };
        
        if (item.item_type === 'premium_account') {
          updatedUser.is_premium = true;
          updatedUser.is_verified = true;
          updatedUser.verification_color = 'blue';
        } else if (item.item_type === 'verification') {
          updatedUser.is_verified = true;
          updatedUser.verification_color = 'red';
        } else if (item.item_type === 'premium_emoji') {
          updatedUser.premium_emoji_enabled = true;
        } else if (item.item_type === 'super_likes') {
          updatedUser.super_likes_count = (user.super_likes_count || 0) + 50;
        } else if (item.item_type === 'custom_theme') {
          updatedUser.custom_theme = 'red-dark';
          setProfileTheme('red-dark');
        }
        
        setUser(updatedUser);
        localStorage.setItem('ynaut_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      toast.error('Ошибка покупки');
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setNewPostMedia(base64);
      setNewPostMediaType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    
    if (diff < 60) return `${diff} мин назад`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const getVerificationIcon = (color?: string) => {
    if (color === 'blue') return <Icon name="BadgeCheck" size={16} className="text-blue-500" />;
    if (color === 'red') return <Icon name="BadgeCheck" size={16} className="text-red-500" />;
    return <Icon name="BadgeCheck" size={16} className="text-primary" />;
  };

  const getProfileThemeClass = () => {
    if (profileTheme === 'red-dark') return 'bg-gradient-to-br from-red-900 to-black';
    if (profileTheme === 'red') return 'bg-gradient-to-br from-red-500 to-red-700';
    if (profileTheme === 'orange') return 'bg-gradient-to-br from-orange-500 to-orange-700';
    if (profileTheme === 'yellow') return 'bg-gradient-to-br from-yellow-500 to-yellow-700';
    if (profileTheme === 'green') return 'bg-gradient-to-br from-green-500 to-green-700';
    if (profileTheme === 'blue') return 'bg-gradient-to-br from-blue-500 to-blue-700';
    if (profileTheme === 'indigo') return 'bg-gradient-to-br from-indigo-500 to-indigo-700';
    if (profileTheme === 'violet') return 'bg-gradient-to-br from-violet-500 to-violet-700';
    return 'bg-primary/5';
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-3xl mb-4">
              Y
            </div>
            <h1 className="text-3xl font-bold text-primary">Ynaut</h1>
            <p className="text-muted-foreground mt-2">Социальная сеть с юнакоинами</p>
          </div>

          <div className="flex gap-2 mb-6">
            <Button 
              variant={authMode === 'login' ? 'default' : 'outline'} 
              className="flex-1"
              onClick={() => setAuthMode('login')}
            >
              Вход
            </Button>
            <Button 
              variant={authMode === 'register' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setAuthMode('register')}
            >
              Регистрация
            </Button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Отображаемое имя</Label>
                  <Input id="display_name" name="display_name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Имя пользователя</Label>
              <Input id="username" name="username" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" className="w-full">
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
              Y
            </div>
            <span className="text-2xl font-bold text-primary">Ynaut</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
            >
              <Icon name={isDark ? 'Sun' : 'Moon'} size={20} />
            </Button>

            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <Icon name="Coins" size={20} className="text-primary" />
              <span className="font-semibold text-foreground">{user?.yn_balance}</span>
              <span className="text-sm text-muted-foreground">YN</span>
            </div>

            {user?.super_likes_count && user.super_likes_count > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg">
                <Icon name="Sparkles" size={16} className="text-white" />
                <span className="text-sm font-semibold text-white">{user.super_likes_count}</span>
              </div>
            )}

            <Avatar className="h-9 w-9 border-2 border-primary cursor-pointer hover:scale-105 transition-transform">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {stories.length > 0 && (
          <div className="container px-4 py-3 flex gap-3 overflow-x-auto">
            <div className="flex-shrink-0">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCreateStory(e.target.files[0])}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center">
                    <Icon name="Plus" size={24} className="text-primary" />
                  </div>
                  <span className="text-xs">Создать</span>
                </div>
              </label>
            </div>
            
            {stories.map((story, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 cursor-pointer"
                onClick={() => {
                  setSelectedStory(story);
                  setStoryIndex(0);
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-[2px]">
                    <Avatar className="w-full h-full border-2 border-background">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {story.user.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs max-w-[64px] truncate">{story.user.display_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md">
          {selectedStory && (
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {selectedStory.user.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold flex items-center gap-1">
                    {selectedStory.user.display_name}
                    {selectedStory.user.is_verified && getVerificationIcon(selectedStory.user.verification_color)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedStory.stories[storyIndex].created_at)}
                  </p>
                </div>
              </div>

              {selectedStory.stories[storyIndex].media_type.startsWith('image') ? (
                <img
                  src={selectedStory.stories[storyIndex].media_url}
                  alt="Story"
                  className="w-full rounded-lg"
                />
              ) : (
                <video
                  src={selectedStory.stories[storyIndex].media_url}
                  controls
                  autoPlay
                  className="w-full rounded-lg"
                />
              )}

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStoryIndex(Math.max(0, storyIndex - 1))}
                  disabled={storyIndex === 0}
                >
                  <Icon name="ChevronLeft" size={16} />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {storyIndex + 1} / {selectedStory.stories.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStoryIndex(Math.min(selectedStory.stories.length - 1, storyIndex + 1))}
                  disabled={storyIndex === selectedStory.stories.length - 1}
                >
                  <Icon name="ChevronRight" size={16} />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="feed" className="gap-2">
              <Icon name="Home" size={18} />
              <span className="hidden sm:inline">Лента</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2">
              <Icon name="Radio" size={18} />
              <span className="hidden sm:inline">Каналы</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="gap-2">
              <Icon name="ShoppingBag" size={18} />
              <span className="hidden sm:inline">Магазин</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="gap-2">
              <Icon name="MessageCircle" size={18} />
              <span className="hidden sm:inline">Чаты</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Icon name="User" size={18} />
              <span className="hidden sm:inline">Профиль</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4 animate-fade-in">
            <Card className="p-4">
              <div className="space-y-3">
                <Textarea 
                  placeholder="Что у вас нового?" 
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[100px]"
                />
                
                {user?.premium_emoji_enabled && (
                  <div className="flex gap-2 flex-wrap">
                    {PREMIUM_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setNewPostContent(newPostContent + emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept="image/*,video/*"
                    onChange={handleMediaUpload}
                    className="flex-1"
                  />
                  {channels.length > 0 && (
                    <select
                      value={selectedChannelId || ''}
                      onChange={(e) => setSelectedChannelId(e.target.value ? Number(e.target.value) : null)}
                      className="px-3 py-2 border rounded-md"
                    >
                      <option value="">Без канала</option>
                      {channels.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  )}
                  <Button onClick={handleCreatePost} disabled={!newPostContent.trim()}>
                    <Icon name="Send" size={18} className="mr-2" />
                    Опубликовать
                  </Button>
                </div>
              </div>
            </Card>

            {posts.length === 0 ? (
              <Card className="p-12 text-center">
                <Icon name="Inbox" size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Пока нет постов. Будьте первым!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id} className={`p-6 transition-all ${post.is_boosted ? 'border-2 border-yellow-500 shadow-lg' : ''}`}>
                    {post.is_boosted && (
                      <div className="flex items-center gap-2 mb-3 text-yellow-600">
                        <Icon name="Zap" size={16} />
                        <span className="text-sm font-semibold">Продвигается</span>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                          {post.author.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-foreground">{post.author.display_name}</p>
                          {post.author.is_verified && getVerificationIcon(post.author.verification_color)}
                          {post.author.is_premium && (
                            <Icon name="Crown" size={14} className="text-yellow-500" />
                          )}
                          <span className="text-sm text-muted-foreground">· {formatDate(post.created_at)}</span>
                        </div>

                        <p className="text-foreground mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                        {post.media_url && (
                          <div className="mb-4 rounded-lg overflow-hidden">
                            {post.media_type?.startsWith('image') ? (
                              <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-cover" />
                            ) : post.media_type?.startsWith('video') ? (
                              <video src={post.media_url} controls className="w-full max-h-96" />
                            ) : null}
                          </div>
                        )}

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleLike(post.id, false)}
                            >
                              <Icon 
                                name="Heart" 
                                size={18} 
                                className={likedPosts.includes(post.id) ? 'fill-primary text-primary' : ''} 
                              />
                              <span>{post.likes_count}</span>
                            </Button>
                            
                            {user?.super_likes_count && user.super_likes_count > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLike(post.id, true)}
                                className="gap-1 text-pink-500 hover:text-pink-600"
                              >
                                <Icon name="Sparkles" size={16} />
                              </Button>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => {
                              if (showComments === post.id) {
                                setShowComments(null);
                              } else {
                                setShowComments(post.id);
                                if (!comments[post.id]) loadComments(post.id);
                              }
                            }}
                          >
                            <Icon name="MessageCircle" size={18} />
                            <span>{post.comments_count}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Icon name="Share2" size={18} />
                          </Button>
                        </div>

                        {showComments === post.id && (
                          <div className="mt-4 space-y-3">
                            <Separator />
                            <div className="flex gap-2">
                              <Input
                                placeholder="Написать комментарий..."
                                value={newComment[post.id] || ''}
                                onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleComment(post.id);
                                  }
                                }}
                              />
                              <Button size="sm" onClick={() => handleComment(post.id)}>
                                <Icon name="Send" size={16} />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              {comments[post.id]?.map((comment) => (
                                <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                      {comment.author.display_name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-semibold">{comment.author.display_name}</p>
                                      {comment.author.is_verified && getVerificationIcon(comment.author.verification_color)}
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(comment.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-sm">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="channels" className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Каналы</h2>
              <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
                <DialogTrigger asChild>
                  <Button>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Создать канал
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создать новый канал</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Название канала</Label>
                      <Input
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="Мой канал"
                      />
                    </div>
                    <div>
                      <Label>Описание</Label>
                      <Textarea
                        value={newChannelDesc}
                        onChange={(e) => setNewChannelDesc(e.target.value)}
                        placeholder="О чем ваш канал?"
                      />
                    </div>
                    <Button onClick={handleCreateChannel} className="w-full">
                      Создать (+50 YN)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {channels.length === 0 ? (
              <Card className="p-12 text-center">
                <Icon name="Radio" size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Пока нет каналов. Создайте первый!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel) => (
                  <Card key={channel.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Icon name="Radio" size={24} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{channel.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{channel.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {channel.subscribers_count} подписчиков
                      </span>
                      <Button size="sm">Подписаться</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shop" className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Магазин премиум-функций</h2>
              <p className="text-muted-foreground">
                Улучшайте свой опыт на Ynaut с помощью юнакоинов
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shopItems.map((item) => (
                <Card key={item.id} className="p-6 hover:shadow-lg transition-all relative overflow-hidden group">
                  {item.category === 'premium' && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold rounded-bl-lg">
                      PREMIUM
                    </div>
                  )}
                  
                  <div className="flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon name={item.icon as any} size={28} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <Icon name="Coins" size={20} className="text-primary" />
                        <span className="text-xl font-bold">{item.price}</span>
                        <span className="text-sm text-muted-foreground">YN</span>
                      </div>
                      <Button 
                        onClick={() => handlePurchase(item)}
                        disabled={(user?.yn_balance || 0) < item.price}
                        size="sm"
                      >
                        Купить
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="chats" className="animate-fade-in">
            <Card className="p-12 text-center">
              <Icon name="MessageCircle" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Чаты доступны только между реальными пользователями</p>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className={`p-8 ${getProfileThemeClass()}`}>
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-24 w-24 mb-4 border-4 border-white/50">
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {user?.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">{user?.display_name}</h2>
                    {user?.is_verified && (
                      <div className={user.verification_color === 'blue' ? 'text-blue-300' : 'text-red-300'}>
                        {getVerificationIcon(user.verification_color)}
                      </div>
                    )}
                  </div>
                  <p className="text-white/80">@{user?.username}</p>
                  {user?.is_premium && (
                    <Badge className="mt-2 gap-1 bg-yellow-500 text-white">
                      <Icon name="Crown" size={12} />
                      Premium
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 bg-white/20 text-white border-white/30"
                    onClick={() => {
                      localStorage.removeItem('ynaut_user');
                      setUser(null);
                      setShowAuth(true);
                    }}
                  >
                    Выйти
                  </Button>
                </div>
              </Card>

              {user?.is_premium && (
                <Card className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Радужные темы профиля</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {RAINBOW_THEMES.map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setProfileTheme(theme)}
                        className={`h-16 rounded-lg transition-all ${
                          theme === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                          theme === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                          theme === 'yellow' ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' :
                          theme === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700' :
                          theme === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                          theme === 'indigo' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                          'bg-gradient-to-br from-violet-500 to-violet-700'
                        } ${profileTheme === theme ? 'ring-4 ring-primary scale-105' : ''}`}
                      />
                    ))}
                  </div>
                </Card>
              )}

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Icon name="Coins" size={20} className="text-primary" />
                  Баланс юнакоинов
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Текущий баланс</p>
                      <p className="text-3xl font-bold text-primary">{user?.yn_balance} YN</p>
                    </div>
                    <Icon name="TrendingUp" size={40} className="text-primary/30" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Как получить больше YN:</p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Icon name="Heart" size={16} className="text-primary" />
                        <span>+5 YN за каждый лайк</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="MessageCircle" size={16} className="text-primary" />
                        <span>+10 YN за комментарий</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Edit" size={16} className="text-primary" />
                        <span>+20 YN за публикацию поста</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Image" size={16} className="text-primary" />
                        <span>+15 YN за создание истории</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Radio" size={16} className="text-primary" />
                        <span>+50 YN за создание канала</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
