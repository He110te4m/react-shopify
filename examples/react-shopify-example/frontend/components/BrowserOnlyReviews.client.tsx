const browserHref = window.location.href;

export type BrowserOnlyReviewsProps = {
  productTitle: string;
};

export default function BrowserOnlyReviews({ productTitle }: BrowserOnlyReviewsProps) {
  return (
    <aside style={{ border: "1px solid #2f7d32", padding: "16px", borderRadius: "12px" }}>
      <strong>Browser-only reviews widget</strong>
      <p>{`Mounted in browser for: ${productTitle}`}</p>
      <small>{`Current URL: ${browserHref}`}</small>
    </aside>
  );
}
