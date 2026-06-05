import { ShopifyImage } from "vite-plugin-react-shopify/runtime";

interface ImageHeroProps {
  image: string;
  alt?: string;
  cdnWidth?: number;
  cdnHeight?: number;
}

/**
 * Full-width hero image.  Does **not** specify loading/fetchPriority/preload
 * so it relies on the auto-load inference from {@code section.index}.
 */
export default function ImageHero({
  image,
  alt = "",
  cdnWidth = 2000,
  cdnHeight,
}: ImageHeroProps) {
  return (
    <div className="image-hero">
      <ShopifyImage
        image={image}
        alt={alt}
        width={cdnWidth}
        height={cdnHeight}
        tagWidth={cdnWidth}
        tagHeight={cdnHeight}
        style={{ display: "block", width: "100%" }}
      />
    </div>
  );
}
