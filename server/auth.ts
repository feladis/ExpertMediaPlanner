import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import express, { Request, Response, NextFunction } from 'express';
import { sessionMiddleware } from './session';
import { storage } from './storage';

// Interface for Google user profile
interface GoogleUser {
  id: string;
  emails?: { value: string; verified: boolean }[];
  displayName?: string;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  photos?: { value: string }[];
}

// Setup the Google authentication strategy
export function setupGoogleAuth(app: express.Express) {
  // Initialize session and passport middleware
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: '/api/auth/google/callback',
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists by email
          const email = profile.emails && profile.emails[0]?.value;
          
          if (email) {
            let existingUser = await storage.getExpertByEmail(email);
            
            if (existingUser) {
              // User exists, update their profile with Google information if needed
              const updatedUser = await storage.updateExpert(existingUser.id, {
                name: profile.displayName || existingUser.name,
                profileImage: profile.photos?.[0]?.value || existingUser.profileImage
              });
              
              return done(null, updatedUser);
            } else {
              // Create a new user from Google profile
              const newUser = await storage.createExpert({
                username: email.split('@')[0], // Create username from email
                email: email,
                password: 'google-auth-' + Math.random().toString(36).substring(2, 15), // Generate random password
                name: profile.displayName || 'Google User',
                role: '',
              });
              
              return done(null, newUser);
            }
          } else {
            return done(new Error('No email provided from Google'), undefined);
          }
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );

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
  app.get(
    '/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to dashboard
      res.redirect('/dashboard');
    }
  );

  // Check if user is authenticated
  app.use('/api/auth/user', (req: Request, res: Response) => {
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