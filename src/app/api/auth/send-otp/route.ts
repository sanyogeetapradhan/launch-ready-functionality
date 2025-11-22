import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { otpStore } from "@/lib/otp-store";
import { db } from "@/db"; // Your Drizzle db instance
import { user as users } from "@/db/schema"; // Your users table schema
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json(
        { error: "No account exists with this email" },
        { status: 404 }
      );
    }

    // Generate and store OTP
    const otp = otpStore.generateOTP();
    otpStore.set(email, otp);

    // Send OTP via Resend
    await resend.emails.send({
      from: "StockMaster <onboarding@yourdomain.com>", // Replace with your verified domain
      to: email,
      subject: "Password Reset - OTP Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the following OTP to continue:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { message: "OTP sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}