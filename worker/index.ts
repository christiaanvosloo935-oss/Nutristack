import { handleAiRecipes, type AiEnv } from "../shared/aiHandler";

// Static files are served straight from ./dist (see wrangler.jsonc); only /api/* reaches this Worker.
export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/ai-recipes") return handleAiRecipes(request, env);
    return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });
  },
} satisfies ExportedHandler<AiEnv>;
