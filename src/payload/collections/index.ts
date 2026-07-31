import { Categories } from "@/payload/collections/categories/schema";
import { Media } from "@/payload/collections/media/schema";
import { Pages } from "@/payload/collections/pages/schema";
import { Posts } from "@/payload/collections/posts/schema";
import { Users } from "@/payload/collections/users/schema";

const collections = [Media, Pages, Posts, Categories, Users];

export { collections };
