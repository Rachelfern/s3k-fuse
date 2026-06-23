import Image from "next/image";
import { getProductImageUrl } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export type ProductImageSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<ProductImageSize, string> = {
  xs: "size-12 rounded-md",
  sm: "size-14 rounded-xl",
  md: "size-16 rounded-xl",
  lg: "size-20 rounded-xl",
};

const IMAGE_SIZES: Record<ProductImageSize, string> = {
  xs: "48px",
  sm: "56px",
  md: "64px",
  lg: "80px",
};

interface ProductImageProps {
  productId: string;
  name: string;
  imageUrl?: string | null;
  size?: ProductImageSize;
  /** Fill the parent container (e.g. product card hero) */
  fill?: boolean;
  className?: string;
}

export function ProductImage({
  productId,
  name,
  imageUrl,
  size = "sm",
  fill = false,
  className,
}: ProductImageProps) {
  const src = getProductImageUrl({ id: productId, image_url: imageUrl });

  if (fill) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-gray-100",
          className,
        )}
      >
        {src ? (
          <Image src={src} alt={name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 240px" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-4xl">
            🛒
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-gray-100",
        SIZE_CLASS[size],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={IMAGE_SIZES[size]}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-100 text-xl">
          🛒
        </div>
      )}
    </div>
  );
}
