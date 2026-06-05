import { ShopifyImage } from "vite-plugin-react-shopify/runtime";

interface ImageCardProps {
  image: string;
  title?: string;
  alt?: string;
  aspectWidth?: number;
  aspectHeight?: number;
}

/**
 * Image card with a title caption.  Does **not** specify
 * loading/fetchPriority/preload so it relies on auto-load inference.
 */
export default function ImageCard({
  image,
  title,
  alt = "",
  aspectWidth = 600,
  aspectHeight = 400,
}: ImageCardProps) {
  return (
    <figure style={{ margin: 0 }}>
      <ShopifyImage
        image={image}
        alt={alt}
        width={aspectWidth}
        height={aspectHeight}
        crop="center"
        tagWidth={aspectWidth}
        tagHeight={aspectHeight}
        style={{ display: "block", width: "100%" }}
      />
      {title && (
        <figcaption style={{ padding: "0.5rem 0" }}>{title}</figcaption>
      )}
    </figure>
  );
}
