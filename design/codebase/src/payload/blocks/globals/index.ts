import { Branding } from "@/payload/blocks/globals/branding/schema";
import { Footer } from "@/payload/blocks/globals/footer/schema";
import { Header } from "@/payload/blocks/globals/header/schema";
import { PlatformSettings } from "@/payload/blocks/globals/platform-settings/schema";

// single registration point for all Payload globals — add new globals here to make them available site-wide
const globals = [Header, Footer, Branding, PlatformSettings];

export { globals };
