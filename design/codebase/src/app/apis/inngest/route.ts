import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/index";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
