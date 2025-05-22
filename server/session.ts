import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db';
import { Expert } from '@shared/schema';

// Add user type to Express Session
declare module 'express-session' {
  interface SessionData {
    user: {
      id: number;
      username: string;
      name: string;
      role: string;
      profileComplete: boolean;
      profileImage?: string;
    };
  }
}

// Configure session store with Postgres
const PgSession = connectPgSimple(session);

// Create session middleware
export const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'expertplanner-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === 'production'
  }
});