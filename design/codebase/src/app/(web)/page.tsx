import PageTemplate, { generateMetadata } from "@/app/(web)/[slug]/page";

// this file acts as a simple re-export file for the root index page.
// it allows the main page template and its metadata function to be used
// directly under the root path '/' if that route points here.
export { PageTemplate as default, generateMetadata };
