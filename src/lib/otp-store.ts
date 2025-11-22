// In-memory OTP storage with expiration
interface OTPData {
  otp: string;
  email: string;
  expiresAt: number;
}

class OTPStore {
  private store: Map<string, OTPData> = new Map();

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP with 10-minute expiration
  set(email: string, otp: string): void {
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    this.store.set(email.toLowerCase(), { otp, email, expiresAt });
  }

  // Verify OTP
  verify(email: string, otp: string): boolean {
    const data = this.store.get(email.toLowerCase());
    
    if (!data) return false;
    
    // Check if expired
    if (Date.now() > data.expiresAt) {
      this.store.delete(email.toLowerCase());
      return false;
    }

    // Check if OTP matches
    if (data.otp === otp) {
      return true;
    }

    return false;
  }

  // Remove OTP after successful password reset
  delete(email: string): void {
    this.store.delete(email.toLowerCase());
  }

  // Cleanup expired OTPs (optional, runs periodically)
  cleanup(): void {
    const now = Date.now();
    for (const [email, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(email);
      }
    }
  }
}

export const otpStore = new OTPStore();

// Run cleanup every 5 minutes
setInterval(() => otpStore.cleanup(), 5 * 60 * 1000);