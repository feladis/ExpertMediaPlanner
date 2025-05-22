import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface EmailVerificationProps {
  email: string;
  onVerified: (verified: boolean) => void;
}

export default function EmailVerification({ email, onVerified }: EmailVerificationProps) {
  const { toast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Send verification code on component mount
  useEffect(() => {
    sendVerificationCode();
  }, []);

  // Countdown timer for resending code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    if (sendingCode) return;
    
    setSendingCode(true);
    try {
      await apiRequest('POST', '/api/verify/send-code', { email });
      
      toast({
        title: 'Verification code sent',
        description: `We've sent a 6-digit code to ${email}`,
      });
      
      // Start countdown timer (2 minutes)
      setCountdown(120);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setCode(digits);
      
      // Focus the last input
      const lastInput = document.getElementById('code-5');
      if (lastInput) lastInput.focus();
    }
  };

  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter all 6 digits of your verification code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/verify/check-code', { 
        email, 
        code: fullCode 
      });

      const data = await response.json();
      
      if (data.verified) {
        toast({
          title: 'Email verified',
          description: 'Your email has been successfully verified',
        });
        onVerified(true);
      } else {
        toast({
          title: 'Verification failed',
          description: data.message || 'Invalid or expired verification code',
          variant: 'destructive',
        });
        // Reset code fields
        setCode(['', '', '', '', '', '']);
        // Focus first input
        const firstInput = document.getElementById('code-0');
        if (firstInput) firstInput.focus();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Verify your email</h3>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit verification code to <span className="font-medium">{email}</span>
        </p>
      </div>
      
      <div className="flex flex-col space-y-4">
        <Label htmlFor="code-0">Enter verification code</Label>
        <div className="flex justify-between gap-2">
          {code.map((digit, index) => (
            <Input
              key={index}
              id={`code-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-12 text-center text-lg"
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              autoComplete="off"
            />
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Button 
          className="w-full" 
          onClick={verifyCode} 
          disabled={loading || code.some(d => d === '')}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Verify Code
        </Button>
        
        <div className="flex justify-center">
          <Button
            variant="link"
            size="sm"
            onClick={sendVerificationCode}
            disabled={sendingCode || countdown > 0}
          >
            {sendingCode ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {countdown > 0 ? (
              `Resend code in ${countdown}s`
            ) : (
              'Resend code'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}