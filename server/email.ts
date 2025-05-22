import nodemailer from 'nodemailer';
import { nanoid } from 'nanoid';
import { db } from './db';
import { verificationCodes } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Create reusable transporter object using SMTP transport
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Can be changed to any SMTP server
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '', // email address
    pass: process.env.EMAIL_PASSWORD || '', // app password (for Gmail)
  },
});

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

// Save the verification code to the database
export const saveVerificationCode = async (email: string, code: string): Promise<void> => {
  // First, delete any existing verification codes for this email
  await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
  
  // Then, insert the new verification code
  await db.insert(verificationCodes).values({
    email,
    code,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
  });
};

// Verify a code against what's stored in the database
export const verifyCode = async (email: string, code: string): Promise<boolean> => {
  const [record] = await db.select()
    .from(verificationCodes)
    .where(
      sql`${verificationCodes.email} = ${email} AND 
          ${verificationCodes.code} = ${code} AND 
          ${verificationCodes.expiresAt} > NOW()`
    );
  
  if (record) {
    // Delete the verification code once it's been used
    await db.delete(verificationCodes).where(eq(verificationCodes.id, record.id));
    return true;
  }
  
  return false;
};

// Send a verification email
export const sendVerificationEmail = async (to: string, code: string): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: `"ExpertPlanner" <${process.env.EMAIL_USER || 'noreply@expertplanner.com'}>`,
      to,
      subject: 'Verify your email for ExpertPlanner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #0984E3;">Verify Your Email</h2>
          <p>Thank you for registering with ExpertPlanner. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f5f6fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="color: #0984E3; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #777; font-size: 12px;">ExpertPlanner - Your AI-powered content strategy assistant</p>
        </div>
      `
    });
    
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};