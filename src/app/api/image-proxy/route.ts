import { NextRequest } from "next/server";
import { safeFetch, SafeFetchError } from "@/lib/safe-fetch";
import { isSameOriginRequest } from "@/lib/csrf";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(request: NextRequest) {
  // The proxy is only called from article HTML rendered inside the app; a
  // missing or cross-origin Referer means someone else is trying to use our
  // server as a generic URL fetcher.
  if (!isSameOriginRequest(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const target = request.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("Missing url", { status: 400 });
  }

  try {
    const result = await safeFetch(target, {
      accept: "image/*",
      maxBytes: MAX_BYTES,
    });

    const contentType = result.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new Response("Not an image", { status: 415 });
    }

    return new Response(result.body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    if (err instanceof SafeFetchError) {
      if (err.code === "bad_url" || err.code === "bad_protocol") {
        return new Response(err.message, { status: 400 });
      }
      if (err.code === "too_large") {
        return new Response("Image too large", { status: 413 });
      }
    }
    return new Response("Fetch error", { status: 502 });
  }
}
