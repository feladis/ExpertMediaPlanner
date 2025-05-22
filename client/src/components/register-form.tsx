import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import EmailVerification from './email-verification';
import { Expert } from '../App';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  role: z.string().min(2, { message: 'Please enter your professional role' }),
});

interface RegisterFormProps {
  onSuccess: (expert: Expert) => void;
  onCancel: () => void;
}

export default function RegisterForm({ onSuccess, onCancel }: RegisterFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      password: '',
      role: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setLoading(true);
    try {
      // Move to verification step
      setStep('verification');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to register. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = async (verified: boolean) => {
    if (!verified) return;
    
    const values = form.getValues();
    setLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/register', {
        ...values,
        verificationCode: values.email, // Using email as temporary verification code storage
      });
      
      const expert = await response.json();
      
      toast({
        title: 'Registration successful',
        description: 'Your account has been created successfully',
      });
      
      onSuccess(expert);
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Failed to create your account. Please try again.',
        variant: 'destructive',
      });
      // Go back to form step
      setStep('form');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailVerified = (verified: boolean) => {
    if (verified) {
      // Complete registration with verification code
      handleVerified(true);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          {step === 'form' 
            ? 'Sign up to get started with ExpertPlanner'
            : 'Verify your email to complete registration'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {step === 'form' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johnsmith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professional Role</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Consultant" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
            </form>
          </Form>
        ) : (
          <EmailVerification 
            email={form.getValues('email')} 
            onVerified={handleEmailVerified} 
          />
        )}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={onCancel}>
          Back to login
        </Button>
      </CardFooter>
    </Card>
  );
}