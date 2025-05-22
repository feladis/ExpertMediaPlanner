import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import express, { Request, Response, NextFunction } from 'express';
import { sessionMiddleware } from './session';
import { storage } from './storage';

// Setup the Google authentication strategy
export function setupGoogleAuth(app: express.Express) {
  // Initialize session and passport middleware
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/google/callback'
  }, 
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract email from profile
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email provided by Google'), null);
      }
      
      // Try to find existing user by email
      let user = await storage.getExpertByEmail(email);
      
      if (user) {
        // Update existing user with Google info
        user = await storage.updateExpert(user.id, {
          name: profile.displayName || user.name,
          profileImage: profile.photos?.[0]?.value || user.profileImage
        });
      } else {
        // Create new user from Google profile
        user = await storage.createExpert({
          username: email.split('@')[0], // Create username from email
          email: email,
          password: 'google-auth-' + Math.random().toString(36).substring(2, 15),
          name: profile.displayName || 'Google User',
          role: 'Expert',
        });
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google auth error:', error);
      return done(error, null);
    }
  }));

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getExpert(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Authentication routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account'
    })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { 
      failureRedirect: '/login',
      failureMessage: true
    }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/');
    }
  );

  // User info endpoint
  app.get('/api/auth/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  // Logout route
  app.get('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error during logout' });
      }
      res.redirect('/login');
    });
  });

  // Authentication middleware for protecting routes
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  };

  return { requireAuth };
}