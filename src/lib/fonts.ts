import { Geist, Plus_Jakarta_Sans } from "next/font/google";

// configure brand-specific typography once; imported by every root layout
const geist = Geist({ subsets: ["latin"] });
const jakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });

export { geist, jakartaSans };
