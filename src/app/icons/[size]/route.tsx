import { renderAppIcon } from "@/lib/app-icon";

const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const px = Number(size);
  if (!SIZES.includes(px)) return new Response("Not found", { status: 404 });
  return renderAppIcon(px);
}
