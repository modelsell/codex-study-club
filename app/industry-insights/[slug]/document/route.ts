import { getIndustryInsight } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Props) {
  const item = getIndustryInsight((await params).slug);
  if (!item) return new Response("Not found", { status: 404 });

  return new Response(item.html, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Content-Security-Policy":
        "default-src 'self' data: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
