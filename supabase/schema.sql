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

-- 7. "likes" table
CREATE TABLE IF NOT EXISTS public.likes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT likes_pkey PRIMARY KEY (id),
    CONSTRAINT likes_user_id_post_id_key UNIQUE (user_id, post_id) -- Prevent duplicate likes
);

-- likes table RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view all likes" ON public.likes;
CREATE POLICY "Allow authenticated users to view all likes" ON public.likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own likes" ON public.likes;
CREATE POLICY "Allow authenticated users to insert their own likes" ON public.likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes." ON public.likes;
CREATE POLICY "Users can delete their own likes." ON public.likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. RPC function to get posts with likes
DROP FUNCTION IF EXISTS get_posts_with_likes(uuid);
CREATE OR REPLACE FUNCTION get_posts_with_likes(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    image_url text,
    caption text,
    created_at timestamptz,
    profiles json,
    like_count bigint,
    user_has_liked boolean,
    author_is_followed boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.image_url,
        p.caption,
        p.created_at,
        json_build_object(
            'username', pr.username,
            'avatar_url', pr.avatar_url
        ),
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) as like_count,
        EXISTS(SELECT 1 FROM public.likes l WHERE l.post_id = p.id AND l.user_id = p_user_id) as user_has_liked,
        EXISTS(SELECT 1 FROM public.followers f WHERE f.following_id = p.user_id AND f.follower_id = p_user_id) as author_is_followed
    FROM
        public.posts p
    JOIN
        public.profiles pr ON p.user_id = pr.id
    ORDER BY
        p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. RPC function to get post details with likes
DROP FUNCTION IF EXISTS get_post_details(uuid, uuid);
CREATE OR REPLACE FUNCTION get_post_details(p_post_id uuid, p_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    image_url text,
    caption text,
    created_at timestamptz,
    profiles json,
    like_count bigint,
    user_has_liked boolean,
    author_is_followed boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.user_id,
        p.image_url,
        p.caption,
        p.created_at,
        json_build_object(
            'username', pr.username,
            'avatar_url', pr.avatar_url
        ),
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id = p.id) as like_count,
        EXISTS(SELECT 1 FROM public.likes l WHERE l.post_id = p.id AND l.user_id = p_user_id) as user_has_liked,
        EXISTS(SELECT 1 FROM public.followers f WHERE f.following_id = p.user_id AND f.follower_id = p_user_id) as author_is_followed
    FROM
        public.posts p
    JOIN
        public.profiles pr ON p.user_id = pr.id
    WHERE
        p.id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- 10. "comment_likes" table
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
    CONSTRAINT comment_likes_user_id_comment_id_key UNIQUE (user_id, comment_id)
);

-- comment_likes table RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view all comment likes" ON public.comment_likes;
CREATE POLICY "Allow authenticated users to view all comment likes" ON public.comment_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own comment likes" ON public.comment_likes;
CREATE POLICY "Allow authenticated users to insert their own comment likes" ON public.comment_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment likes." ON public.comment_likes;
CREATE POLICY "Users can delete their own comment likes." ON public.comment_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 11. RPC function to get comments with likes
CREATE OR REPLACE FUNCTION get_comments_with_likes(p_post_id uuid, p_user_id uuid)
RETURNS TABLE (
    id uuid,
    post_id uuid,
    user_id uuid,
    content text,
    created_at timestamptz,
    parent_id uuid,
    profiles json,
    like_count bigint,
    user_has_liked boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        c.parent_id,
        json_build_object(
            'username', pr.username,
            'avatar_url', pr.avatar_url
        ),
        (SELECT COUNT(*) FROM public.comment_likes cl WHERE cl.comment_id = c.id) as like_count,
        EXISTS(SELECT 1 FROM public.comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = p_user_id) as user_has_liked
    FROM
        public.comments c
    JOIN
        public.profiles pr ON c.user_id = pr.id
    WHERE
        c.post_id = p_post_id
    ORDER BY
        c.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 12. "followers" table
CREATE TABLE IF NOT EXISTS public.followers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT followers_pkey PRIMARY KEY (id),
    CONSTRAINT followers_follower_id_following_id_key UNIQUE (follower_id, following_id),
    CONSTRAINT followers_check_not_following_self CHECK (follower_id <> following_id)
);

-- followers table RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view all follows" ON public.followers;
CREATE POLICY "Allow authenticated users to view all follows" ON public.followers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert their own follows" ON public.followers;
CREATE POLICY "Allow authenticated users to insert their own follows" ON public.followers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can delete their own follows." ON public.followers;
CREATE POLICY "Users can delete their own follows." ON public.followers
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 13. RPC function to get profile data with follow status
CREATE OR REPLACE FUNCTION get_profile_data(p_profile_id uuid, p_current_user_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    full_name text,
    avatar_url text,
    website text,
    post_count bigint,
    follower_count bigint,
    following_count bigint,
    is_following boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pr.id,
        pr.username,
        pr.full_name,
        pr.avatar_url,
        pr.website,
        (SELECT COUNT(*) FROM public.posts p WHERE p.user_id = p_profile_id) as post_count,
        (SELECT COUNT(*) FROM public.followers f WHERE f.following_id = p_profile_id) as follower_count,
        (SELECT COUNT(*) FROM public.followers f WHERE f.follower_id = p_profile_id) as following_count,
        EXISTS(SELECT 1 FROM public.followers f WHERE f.following_id = p_profile_id AND f.follower_id = p_current_user_id) as is_following
    FROM
        public.profiles pr
    WHERE
        pr.id = p_profile_id;
END;
$$ LANGUAGE plpgsql;