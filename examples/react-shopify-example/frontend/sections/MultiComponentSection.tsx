import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquid } from "vite-plugin-react-shopify/runtime";
import ImageHero from "../components/ImageHero/ImageHero";
import ImageCard from "../components/ImageCard/ImageCard";

export const shopifyMeta = {
  name: "Multi-Comp Image Test",
  settings: [
    { type: "text", id: "title", label: "Title", default: "Multi-Component auto-load Test" },
    { type: "image_picker", id: "hero_img", label: "Hero Image" },
    { type: "image_picker", id: "card_1_img", label: "Card 1 Image" },
    { type: "image_picker", id: "card_2_img", label: "Card 2 Image" },
    { type: "image_picker", id: "card_3_img", label: "Card 3 Image" },
  ],
  presets: [{ name: "Multi-Component Image Test", category: "Test" }],
} satisfies ShopifyMeta;

/**
 * Uses two separate React components ({@link ImageHero} + {@link ImageCard})
 * that each internally use {@link ShopifyImage}.  All auto-load variables
 * should be shared because they are in the same section.
 */
export default function MultiComponentSection() {
  const [title] = useLiquid<string>("section.settings.title");

  return (
    <section style={{ padding: "2rem 0" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>{title}</h2>

      <ImageHero
        image="section.settings.hero_img"
        alt="Hero"
        cdnWidth={2000}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "2rem" }}>
        <ImageCard
          image="section.settings.card_1_img"
          title="Card 1"
          alt="Card 1"
        />
        <ImageCard
          image="section.settings.card_2_img"
          title="Card 2"
          alt="Card 2"
        />
        <ImageCard
          image="section.settings.card_3_img"
          title="Card 3"
          alt="Card 3"
        />
      </div>
    </section>
  );
}
