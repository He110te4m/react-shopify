import type { ShopifyMeta } from "vite-plugin-react-shopify";
import { useLiquidValue, ShopifyImage } from "vite-plugin-react-shopify/runtime";

export const shopifyMeta = {
  name: "Image Section (React)",
  settings: [
    { type: "image_picker", id: "hero", label: "Hero Image" },
    { type: "image_picker", id: "lazy", label: "Lazy-loaded Image" },
    { type: "image_picker", id: "eager", label: "Eager / Preloaded Image" },
    { type: "image_picker", id: "retina", label: "Retina Image" },
    { type: "text", id: "title", label: "Title", default: "ShopifyImage — image_url | image_tag Demo" },
  ],
  presets: [{ name: "Image Section (React)", category: "Demo" }],
} satisfies ShopifyMeta;

export default function ImageSection() {
  const [title] = useLiquidValue("section.settings.title");

  return (
    <section style={{ padding: "2rem 0" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>{title}</h2>
      <div style={{ display: "grid", gap: "2rem" }}>

        {/* image_url: width → image_tag: alt */}
        <figure>
          <ShopifyImage
            image="section.settings.hero"
            alt="Hero image"
            width={800}
            tagWidth={800}
            className="demo-image"
            style={{ display: "block" }}
          />
          <figcaption>
            image_url: width: 800 → image_tag: alt, width: 800
          </figcaption>
        </figure>

        {/* image_url: width, height, crop → image_tag: loading, decoding, alt */}
        <figure>
          <ShopifyImage
            image="section.settings.lazy"
            alt="Lazy-loaded"
            width={400}
            height={300}
            crop="center"
            loading="lazy"
            decoding="async"
            tagWidth={400}
            tagHeight={300}
            className="demo-image"
            style={{ display: "block" }}
          />
          <figcaption>
            image_url: width: 400, height: 300, crop: &apos;center&apos;
            <br />
            image_tag: loading: &apos;lazy&apos;, decoding: &apos;async&apos;, width: 400, height: 300
          </figcaption>
        </figure>

        {/* image_url: width → image_tag: loading, fetchpriority, preload */}
        <figure>
          <ShopifyImage
            image="section.settings.eager"
            alt="Eager"
            width={1200}
            tagWidth={1200}
            loading="eager"
            fetchPriority="high"
            preload
            className="demo-image"
            style={{ display: "block" }}
          />
          <figcaption>
            image_url: width: 1200
            <br />
            image_tag: loading: &apos;eager&apos;, fetchpriority: &apos;high&apos;, preload: true, width: 1200
          </figcaption>
        </figure>

        {/* image_url: width, height, crop → image_tag: loading, sizes, widths */}
        <figure>
          <ShopifyImage
            image="section.settings.retina"
            alt="Retina"
            width={1200}
            height={800}
            crop="center"
            loading="lazy"
            tagWidth={600}
            tagHeight={400}
            sizes="(max-width: 768px) 100vw, 50vw"
            widths="400, 600, 800, 1200"
            className="demo-image"
            style={{ display: "block" }}
          />
          <figcaption>
            image_url: width: 1200, height: 800, crop: &apos;center&apos;
            <br />
            image_tag: loading: &apos;lazy&apos;, width: 600, height: 400, sizes, widths
          </figcaption>
        </figure>

      </div>
    </section>
  );
}
