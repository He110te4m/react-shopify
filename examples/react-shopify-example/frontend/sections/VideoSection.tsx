import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid, ShopifyVideo } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Video Section (React)",
  settings: [
    { type: "video", id: "hero_video", label: "Hero Video" },
    { type: "text", id: "title", label: "Title", default: "ShopifyVideo — video_tag Demo" },
  ],
  presets: [{ name: "Video Section (React)", category: "Demo" }],
} satisfies ShopifyMeta;

export default function VideoSection() {
  const [title] = useLiquid<string>("section.settings.title");

  return (
    <section style={{ padding: "2rem 0" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>{title}</h2>
      <div style={{ display: "grid", gap: "2rem" }}>

        {/* Bare video_tag — Shopify auto adds playsinline + preload=metadata + poster */}
        <figure>
          <ShopifyVideo
            media="section.settings.hero_video"
            className="demo-video"
            style={{ display: "block", maxWidth: "100%" }}
          />
          <figcaption>video_tag bare — playsinline + preload=metadata + poster (auto)</figcaption>
        </figure>

        {/* video_tag with all controls */}
        <figure>
          <ShopifyVideo
            media="section.settings.hero_video"
            imageSize="800x"
            autoplay
            loop
            muted
            controls
            className="demo-video"
            style={{ display: "block", maxWidth: "100%" }}
          />
          <figcaption>
            video_tag: image_size: &apos;800x&apos;, autoplay, loop, muted, controls
          </figcaption>
        </figure>

      </div>
    </section>
  );
}
