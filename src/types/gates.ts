export type LinkMap = Partial<{
  nft: string;
  listen: string;
  read: string;
  watch: string;
  buy: string;
  donate: string;
}>;

export type GateItem = {
  file: string;
  title: string;
  description?: string;
  tags?: string[];
  order: number;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  links?: LinkMap;
};

export type GatesManifest = {
  defaultSort: "order" | "title" | "createdAt" | "updatedAt";
  items: GateItem[];
};
