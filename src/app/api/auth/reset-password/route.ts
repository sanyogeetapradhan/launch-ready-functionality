import { NextRequest, NextResponse } from "next/server";
import { otpStore } from "@/lib/otp-store";
import { db } from "@/db"; // Your Drizzle db instance
import { user as users } from "@/db/schema"; // Your users table schema
import { eq } from "drizzle-orm";
import { hash } from "bcrypt"; // or whatever hashing library you 

export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = otpStore.verify(email, otp);
    
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password in database
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email.toLowerCase()));

    // Delete OTP after successful reset
    otpStore.delete(email);

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}