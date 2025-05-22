import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import express, { Request, Response, NextFunction } from 'express';

// Define the GoogleUser interface for type safety
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

// Set up Google authentication strategy
export function setupGoogleAuth(app: express.Express) {
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Serialize user object to store in session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getExpert(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
  
  // Configure Google strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists by email
      const googleUser = profile as unknown as GoogleUser;
      const email = googleUser.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error('No email found from Google profile'), null);
      }
      
      // Look for an existing user with this email
      let user = await storage.getExpertByEmail(email);
      
      // If user doesn't exist, create a new one
      if (!user) {
        const newUser = {
          username: email.split('@')[0],
          password: Math.random().toString(36).slice(-8), // Generate random password
          name: googleUser.displayName || email.split('@')[0],
          role: 'Content Creator',
          profileComplete: false,
          profileImage: googleUser.photos?.[0]?.value
        };
        
        user = await storage.createExpert(newUser);
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
  
  // Routes for Google authentication
  app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  
  app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect home
      res.redirect('/');
    }
  );
  
  // Middleware to check if user is authenticated
  app.use('/api/auth/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  // Logout route
  app.get('/api/auth/logout', (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.redirect('/login');
    });
  });
}