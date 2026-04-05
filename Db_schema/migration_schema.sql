-- Supabase SQL Schema for Pixel Audit System
-- Run this in Supabase SQL Editor
-- WARNING: Only run once. If tables already exist, this will NOT destroy data.

-- ══════════════════════════════════════════════════════════════════════
-- 1. Audit Logs Table  (primary: stores CID + request_id from IPFS)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cid text NOT NULL,
  request_id text NOT NULL,
  user_id text DEFAULT 'default_user'::text,
  status text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 2. Users Table  (basic user information)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ══════════════════════════════════════════════════════════════════════
-- 3. Posts Table  (user posts and publishing info)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);