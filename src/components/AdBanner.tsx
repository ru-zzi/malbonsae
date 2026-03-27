import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  adClient: string;
  adSlot: string;
}

export default function AdBanner({ adClient, adSlot }: AdBannerProps) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense load failure - ignore
    }
  }, []);

  return (
    <div className="w-full flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
