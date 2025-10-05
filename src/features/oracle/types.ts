export type Work = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags: string[];
  links?: Partial<Record<"listen" | "watch" | "read" | "nft", string>>;
  releasedAt: string;
  weight?: number;
  previewUrl?: string;
};
