import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req, { params }) {
  const resolvedParams = await params;
  const code = resolvedParams?.code;

  if (!code) {
    return new NextResponse("Invalid QR Short Code", { status: 400 });
  }

  const gasUrl = process.env.GAS_URL;

  // Fallback if GAS_URL is not configured yet
  if (!gasUrl || gasUrl.trim() === "") {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Studio 0.2 — Setup Required</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; color: #14141E; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: white; border: 1px solid #E8DFD5; border-radius: 16px; padding: 36px 28px; max-width: 480px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          h2 { margin: 0 0 10px; color: #15152F; }
          p { color: #6C6C82; line-height: 1.6; margin: 8px 0 20px; }
          .code-badge { background: #F4EFEA; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: bold; color: #FF6B4A; }
          .btn { display: inline-block; background: #00C2A8; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Google Apps Script সংযোগ প্রয়োজন</h2>
          <p>আপনি <span class="code-badge">/r/${code}</span> স্ক্যান করেছেন, তবে সার্ভারে <code>GAS_URL</code> ভ্যারিয়েবল সেট করা হয়নি।</p>
          <p>আপনার <code>.env.local</code> ফাইলে বা Vercel Environment Variables-এ <code>GAS_URL</code> যুক্ত করুন।</p>
          <a class="btn" href="/">এডমিন ড্যাশবোর্ডে যান</a>
        </div>
      </body>
      </html>`,
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  try {
    const fetchUrl = `${gasUrl}?code=${encodeURIComponent(code)}`;
    const res = await fetch(fetchUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "QR-Studio-Vercel-Redirect",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`GAS returned status ${res.status}`);
    }

    const data = await res.json();

    if (data && data.url) {
      let destination = String(data.url).trim();
      if (!destination.startsWith("http://") && !destination.startsWith("https://")) {
        destination = `https://${destination}`;
      }

      // 302 Temporary Redirect (Browser will not cache the destination)
      return NextResponse.redirect(destination, {
        status: 302,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    // Short code not found
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>লিংক পাওয়া যায়নি — 404</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; color: #14141E; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: white; border: 1px solid #E8DFD5; border-radius: 16px; padding: 36px 28px; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          h2 { margin: 0 0 10px; color: #FF6B4A; }
          p { color: #6C6C82; line-height: 1.6; margin: 8px 0 20px; }
          .code-badge { background: #F4EFEA; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: bold; }
          .btn { display: inline-block; background: #15152F; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>৪MD4 — লিংক পাওয়া যায়নি</h2>
          <p>এই শর্ট কোডের <span class="code-badge">${code}</span> সাথে কোনো সক্রিয় লিংক যুক্ত নেই অথবা এটি মুছে ফেলা হয়েছে।</p>
          <a class="btn" href="/">QR Studio হোমপেজ</a>
        </div>
      </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Redirect handler error:", error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head><title>Redirect Error</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;">
        <h2>রিডাইরেক্ট করতে সমস্যা হয়েছে</h2>
        <p>${error.message}</p>
        <p>Google Apps Script সার্ভার রেসপন্স দিচ্ছে না।</p>
      </body>
      </html>`,
      { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
