import { Geist } from "next/font/google";

// configure brand-specific typography once; imported by every root layout
const geist = Geist({ subsets: ["latin"] });

export { geist };
