# InterestConnect v2.0

Полноценная платформа для поиска людей с общими интересами.

## 🚀 Возможности

### ✅ Аутентификация
- Регистрация с email подтверждением
- Вход в систему
- Восстановление пароля (forgot password + reset)
- Google OAuth (Sign in with Google)
- JWT токены для авторизации

### ✅ Пользователи
- Профили с интересами и навыками
- Поиск пользователей с фильтрами
- AI-matching по интересам
- Настройки приватности

### ✅ Сообщества (Communities)
- Создание сообществ
- Присоединение/выход
- Категории и теги
- Участники и роли
- Посты с лайками и комментариями

### ✅ События (Events)
- Создание событий в сообществах
- Регистрация на события
- Онлайн/офлайн формат

### ✅ Друзья
- Отправка запросов в друзья
- Принятие/отклонение
- Список друзей

### ✅ Чат (Socket.IO)
- Приватные сообщения в реальном времени
- Статус online/offline
- Индикатор набора текста
- Групповой чат в сообществах

### ✅ Уведомления
- In-app уведомления
- Real-time через Socket.IO
- Отметка прочитанным

## 🛠 Технологии

### Backend
- Node.js + Express
- Supabase (PostgreSQL)
- Socket.IO
- JWT + bcrypt
- Nodemailer
- Passport.js (Google OAuth)

### Frontend
- React 18
- React Router v6
- Zustand (state management)
- TanStack Query
- Socket.IO Client
- Tailwind CSS
- Lucide Icons

## 📦 Установка

### 1. База данных (Supabase)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Откройте SQL Editor
3. Выполните SQL из файла `backend/database/schema.sql`

### 2. Backend

```bash
cd backend
cp .env.example .env
# Заполните .env своими данными
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Настройка .env

```env
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-secret-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

## 🔑 Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект
3. Включите Google+ API
4. Создайте OAuth credentials
5. Добавьте redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Скопируйте Client ID и Client Secret в .env

## 📱 API Endpoints

### Auth
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/verify-email/:token` - Подтверждение email
- `POST /api/auth/forgot-password` - Запрос сброса пароля
- `POST /api/auth/reset-password` - Сброс пароля
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/me` - Текущий пользователь

### Users
- `GET /api/users/profile/:id` - Профиль
- `PUT /api/users/profile` - Обновить профиль
- `GET /api/users/search` - Поиск
- `GET /api/users/matches` - AI рекомендации
- `GET /api/users/interests` - Список интересов

### Communities
- `GET /api/communities` - Все сообщества
- `GET /api/communities/my` - Мои сообщества
- `POST /api/communities` - Создать
- `GET /api/communities/:id` - Детали
- `POST /api/communities/:id/join` - Присоединиться
- `POST /api/communities/:id/leave` - Выйти

### Events
- `GET /api/events` - Все события
- `POST /api/events` - Создать
- `POST /api/events/:id/join` - Зарегистрироваться
- `POST /api/events/:id/leave` - Отменить регистрацию

### Posts
- `GET /api/posts/community/:id` - Посты сообщества
- `POST /api/posts` - Создать пост
- `POST /api/posts/:id/like` - Лайк
- `POST /api/posts/:id/comments` - Комментарий

### Friends
- `GET /api/friends` - Список друзей
- `GET /api/friends/requests` - Запросы
- `POST /api/friends/request/:userId` - Отправить запрос
- `POST /api/friends/accept/:userId` - Принять
- `POST /api/friends/decline/:userId` - Отклонить

### Messages
- `GET /api/messages/conversations` - Переписки
- `GET /api/messages/user/:userId` - Сообщения с пользователем
- `POST /api/messages/send` - Отправить

### Notifications
- `GET /api/notifications` - Все уведомления
- `PUT /api/notifications/:id/read` - Прочитать
- `PUT /api/notifications/read-all` - Прочитать все

## 🎨 Авторы

Rustem & Daulet - Final Project 2024

## 📄 Лицензия

MIT
