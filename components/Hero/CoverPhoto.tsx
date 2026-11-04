import Image from "next/image";
import type { CSSProperties } from "react";
import type { CoverSettings } from "@/lib/coverSettings";
import styles from "./CoverPhoto.module.css";

interface CoverPhotoProps {
  src: string;
  settings: CoverSettings;
}

/** Enlarging the crop frame lets both axes pan at higher zoom without exposing edges. */
export default function CoverPhoto({ src, settings }: CoverPhotoProps) {
  const style = {
    "--mobile-x": `${settings.mobile.x}%`,
    "--mobile-y": `${settings.mobile.y}%`,
    "--mobile-zoom": settings.mobile.zoom / 100,
    "--desktop-x": `${settings.desktop.x}%`,
    "--desktop-y": `${settings.desktop.y}%`,
    "--desktop-zoom": settings.desktop.zoom / 100,
  } as CSSProperties;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className={styles.frame} style={style}>
        <Image src={src} alt="" fill priority sizes="100vw" className={styles.image} />
      </div>
    </div>
  );
}
