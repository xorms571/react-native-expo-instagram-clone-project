-- 1. "profiles" 테이블 (posts 테이블보다 먼저 생성되어야 합니다)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  PRIMARY KEY (id),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- 2. "posts" 테이블
-- user_id가 이제 public.profiles(id)를 직접 참조합니다.
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    caption text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT posts_pkey PRIMARY KEY (id)
);

-- 3. 새 사용자를 위한 프로필을 생성하는 함수 및 트리거
-- 이 함수는 새 사용자가 가입할 때 호출됩니다.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거가 존재하면 삭제하고, 다시 생성합니다.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. 모든 테이블에 대한 행 수준 보안(RLS) 설정

-- posts 테이블을 위한 RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view all posts" ON public.posts;
CREATE POLICY "Allow authenticated users to view all posts" ON public.posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own posts" ON public.posts;
CREATE POLICY "Allow authenticated users to insert their own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts." ON public.posts;
CREATE POLICY "Users can update their own posts." ON public.posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts." ON public.posts;
CREATE POLICY "Users can delete their own posts." ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- profiles 테이블을 위한 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. 스토리지 버킷 및 정책
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- 스토리지 정책
DROP POLICY IF EXISTS "Allow authenticated users to upload to posts bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to posts bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts');

DROP POLICY IF EXISTS "Allow public read access to posts bucket" ON storage.objects;
CREATE POLICY "Allow public read access to posts bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

-- 6. "comments" 테이블
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    parent_id uuid NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    CONSTRAINT comments_pkey PRIMARY KEY (id)
);

-- comments 테이블을 위한 RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view all comments" ON public.comments;
CREATE POLICY "Allow authenticated users to view all comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own comments" ON public.comments;
CREATE POLICY "Allow authenticated users to insert their own comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments." ON public.comments;
CREATE POLICY "Users can update their own comments." ON public.comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments." ON public.comments;
CREATE POLICY "Users can delete their own comments." ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);