import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Post {
  id: number;
  author: string;
  avatar: string;
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
  channel?: string;
}

interface ShopItem {
  id: number;
  title: string;
  description: string;
  price: number;
  icon: string;
  category: 'premium' | 'bonus';
}

const Index = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [ynBalance, setYnBalance] = useState(250);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);

  const posts: Post[] = [
    {
      id: 1,
      author: 'Александр Петров',
      avatar: 'AP',
      content: 'Только что запустил свой первый проект на Ynaut! Невероятные возможности для развития 🚀',
      likes: 42,
      comments: 8,
      timestamp: '2 часа назад',
      channel: 'Разработка'
    },
    {
      id: 2,
      author: 'Мария Иванова',
      avatar: 'МИ',
      content: 'Кто-нибудь знает как получить больше юнакоинов? Хочу купить премиум-тему!',
      likes: 18,
      comments: 12,
      timestamp: '4 часа назад',
      channel: 'Новички'
    },
    {
      id: 3,
      author: 'Дмитрий Смирнов',
      avatar: 'ДС',
      content: 'Ynaut - это будущее социальных сетей. Экономика внутри платформы открывает новые горизонты! 💎',
      likes: 67,
      comments: 15,
      timestamp: '6 часов назад'
    }
  ];

  const shopItems: ShopItem[] = [
    {
      id: 1,
      title: 'Премиум аккаунт',
      description: 'Без рекламы, расширенная статистика, эксклюзивные темы',
      price: 500,
      icon: 'Crown',
      category: 'premium'
    },
    {
      id: 2,
      title: 'Верификация профиля',
      description: 'Подтвержденный значок на вашем профиле',
      price: 300,
      icon: 'BadgeCheck',
      category: 'premium'
    },
    {
      id: 3,
      title: 'Бустер видимости',
      description: 'Ваши посты на 24 часа в топе ленты',
      price: 150,
      icon: 'Zap',
      category: 'bonus'
    },
    {
      id: 4,
      title: 'Кастомная тема',
      description: 'Уникальное оформление профиля',
      price: 200,
      icon: 'Palette',
      category: 'premium'
    },
    {
      id: 5,
      title: 'Супер-лайк',
      description: 'Пакет из 50 лайков с повышенным весом',
      price: 100,
      icon: 'Heart',
      category: 'bonus'
    },
    {
      id: 6,
      title: 'Премиум эмодзи',
      description: 'Набор эксклюзивных эмодзи для постов и чатов',
      price: 75,
      icon: 'Smile',
      category: 'bonus'
    }
  ];

  const channels = [
    { name: 'Разработка', members: 1243, icon: 'Code' },
    { name: 'Дизайн', members: 892, icon: 'Palette' },
    { name: 'Маркетинг', members: 2156, icon: 'TrendingUp' },
    { name: 'Новички', members: 3421, icon: 'Users' }
  ];

  const handleLike = (postId: number) => {
    if (likedPosts.includes(postId)) {
      setLikedPosts(likedPosts.filter(id => id !== postId));
    } else {
      setLikedPosts([...likedPosts, postId]);
      setYnBalance(prev => prev + 5);
      toast.success('+ 5 YN за активность!');
    }
  };

  const handlePurchase = (item: ShopItem) => {
    if (ynBalance >= item.price) {
      setYnBalance(prev => prev - item.price);
      toast.success(`${item.title} приобретен!`);
    } else {
      toast.error('Недостаточно юнакоинов');
    }
  };

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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <Icon name="Coins" size={20} className="text-primary" />
              <span className="font-semibold text-foreground">{ynBalance}</span>
              <span className="text-sm text-muted-foreground">YN</span>
            </div>

            <Avatar className="h-9 w-9 border-2 border-primary cursor-pointer hover:scale-105 transition-transform">
              <AvatarFallback className="bg-primary text-primary-foreground">ВЫ</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

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
            <Card className="p-4 hover-scale">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/20">ВЫ</AvatarFallback>
                </Avatar>
                <Input 
                  placeholder="Что у вас нового?" 
                  className="flex-1 cursor-pointer"
                  onClick={() => toast.info('Создание постов скоро появится!')}
                />
                <Button size="icon" className="shrink-0">
                  <Icon name="Send" size={18} />
                </Button>
              </div>
            </Card>

            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="p-6 hover-scale transition-all">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {post.avatar}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{post.author}</p>
                          <p className="text-sm text-muted-foreground">{post.timestamp}</p>
                        </div>
                        {post.channel && (
                          <Badge variant="secondary" className="gap-1">
                            <Icon name="Hash" size={12} />
                            {post.channel}
                          </Badge>
                        )}
                      </div>

                      <p className="text-foreground mb-4 leading-relaxed">{post.content}</p>

                      <div className="flex items-center gap-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => handleLike(post.id)}
                        >
                          <Icon 
                            name="Heart" 
                            size={18} 
                            className={likedPosts.includes(post.id) ? 'fill-primary text-primary' : ''} 
                          />
                          <span>{post.likes + (likedPosts.includes(post.id) ? 1 : 0)}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Icon name="MessageCircle" size={18} />
                          <span>{post.comments}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Icon name="Share2" size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels" className="animate-fade-in">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {channels.map((channel, idx) => (
                <Card key={idx} className="p-6 hover-scale cursor-pointer transition-all hover:border-primary/50">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon name={channel.icon as any} size={24} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">#{channel.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Icon name="Users" size={14} />
                        {channel.members.toLocaleString()} участников
                      </p>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    Подписаться
                  </Button>
                </Card>
              ))}
            </div>
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
                <Card key={item.id} className="p-6 hover-scale transition-all relative overflow-hidden group">
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
                        disabled={ynBalance < item.price}
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
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4 md:col-span-1">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Icon name="MessageCircle" size={18} />
                  Чаты
                </h3>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <Avatar>
                          <AvatarFallback className="bg-primary/20">U{i}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">Пользователь {i}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            Последнее сообщение...
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">3</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-4 md:col-span-2">
                <div className="flex flex-col h-[500px]">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Avatar>
                      <AvatarFallback className="bg-primary/20">U1</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">Пользователь 1</p>
                      <p className="text-sm text-muted-foreground">онлайн</p>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 py-4">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-xs">U1</AvatarFallback>
                        </Avatar>
                        <div className="bg-accent p-3 rounded-lg max-w-[70%]">
                          <p className="text-sm">Привет! Как дела?</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-[70%]">
                          <p className="text-sm">Отлично! Что нового?</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 pt-4 border-t">
                    <Input placeholder="Напишите сообщение..." className="flex-1" />
                    <Button size="icon">
                      <Icon name="Send" size={18} />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-24 w-24 mb-4 border-4 border-primary">
                    <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                      ВЫ
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold mb-1">Ваш профиль</h2>
                  <p className="text-muted-foreground">@username</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Редактировать профиль
                  </Button>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">128</p>
                    <p className="text-sm text-muted-foreground">Постов</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">1.2K</p>
                    <p className="text-sm text-muted-foreground">Подписчиков</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">342</p>
                    <p className="text-sm text-muted-foreground">Подписок</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Icon name="Coins" size={20} className="text-primary" />
                  Баланс юнакоинов
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Текущий баланс</p>
                      <p className="text-3xl font-bold text-primary">{ynBalance} YN</p>
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
                        <Icon name="Users" size={16} className="text-primary" />
                        <span>+50 YN за нового подписчика</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold text-lg mb-4">Достижения</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: 'Award', title: 'Первый пост', earned: true },
                    { icon: 'Star', title: '100 лайков', earned: true },
                    { icon: 'Trophy', title: 'Топ автор', earned: false },
                    { icon: 'Zap', title: 'Активист', earned: false }
                  ].map((achievement, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        achievement.earned
                          ? 'border-primary bg-primary/5'
                          : 'border-muted bg-muted/20 opacity-50'
                      }`}
                    >
                      <Icon
                        name={achievement.icon as any}
                        size={24}
                        className={achievement.earned ? 'text-primary' : 'text-muted-foreground'}
                      />
                      <p className="text-sm font-medium mt-2">{achievement.title}</p>
                    </div>
                  ))}
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
