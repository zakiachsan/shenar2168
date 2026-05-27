/**
 * Admin Authentication Utilities
 * Simple session-based auth using cookies
 */

import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

const SESSION_COOKIE = 'shenar2168_admin_session';
const SESSION_EXPIRY = 60 * 60 * 8; // 8 hours in seconds

// Environment variables for admin credentials
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'shenar2168123';

interface AdminSession {
  username: string;
  token: string;
  createdAt: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  // Clear old cookie with restricted path first
  cookieStore.delete({ name: SESSION_COOKIE, path: '/admin' });
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: '/' });
  cookieStore.delete({ name: SESSION_COOKIE, path: '/admin' });
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // In a production app, validate against a session store
  // For simplicity, we just check the token exists
  return {
    username: ADMIN_USER,
    token,
    createdAt: Date.now(),
  };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
