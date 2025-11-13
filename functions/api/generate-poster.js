// Cloudflare Pages Function: /api/generate-poster

export async function onRequest(context) {
  return new Response(
    JSON.stringify({ message: "AI Poster Generator API endpoint" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
}