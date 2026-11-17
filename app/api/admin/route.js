import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const adminPassword = req.headers.get("x-admin-password");
    const configuredPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Authentication check
    if (!adminPassword || adminPassword !== configuredPassword) {
      return NextResponse.json(
        { error: "unauthorized", message: "ভুল এডমিন পাসওয়ার্ড (Invalid Admin Password)" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Quick auth check action
    if (body.action === "check-auth") {
      const isGasConfigured = Boolean(process.env.GAS_URL && process.env.GAS_URL.trim() !== "");
      return NextResponse.json({
        ok: true,
        authenticated: true,
        gasConfigured: isGasConfigured,
      });
    }

    const gasUrl = process.env.GAS_URL;
    const gasSecret = process.env.GAS_SECRET || "qr_studio_super_secret_2026";

    // If GAS_URL is not set yet, return informative status
    if (!gasUrl || gasUrl.trim() === "") {
      return NextResponse.json(
        {
          error: "gas_not_configured",
          message: "Google Apps Script URL (.env.local এ GAS_URL) এখনও সেট করা হয়নি। অনুগ্রহ করে README দেখুন।",
          gasConfigured: false,
        },
        { status: 400 }
      );
    }

    // Forward to Google Apps Script
    const gasRes = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // GAS doPost expects text or JSON
      },
      body: JSON.stringify({
        ...body,
        secret: gasSecret,
      }),
      redirect: "follow",
    });

    if (!gasRes.ok) {
      const errText = await gasRes.text();
      return NextResponse.json(
        { error: "gas_error", message: `Google Apps Script returned status ${gasRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    const gasData = await gasRes.json();
    return NextResponse.json(gasData);
  } catch (error) {
    console.error("Admin API Error:", error);
    return NextResponse.json(
      { error: "server_error", message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
