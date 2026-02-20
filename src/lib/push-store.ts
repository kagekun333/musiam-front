import type { PushSubscription } from "web-push";

// サブスクリプションのメモリストア
// 本番環境ではデータベース (Prisma + PostgreSQL など) に置き換えてください
// Next.js のサーバーは再起動するとメモリが消えるため、開発・検証用途向けです

declare global {
  // グローバル変数として保持することで HMR でもリセットされない
  var __pushSubscriptions: Map<string, PushSubscription> | undefined;
}

if (!global.__pushSubscriptions) {
  global.__pushSubscriptions = new Map();
}

export const pushStore = {
  add(subscription: PushSubscription): void {
    global.__pushSubscriptions!.set(subscription.endpoint, subscription);
  },

  remove(endpoint: string): void {
    global.__pushSubscriptions!.delete(endpoint);
  },

  getAll(): PushSubscription[] {
    return Array.from(global.__pushSubscriptions!.values());
  },

  count(): number {
    return global.__pushSubscriptions!.size;
  },
};
