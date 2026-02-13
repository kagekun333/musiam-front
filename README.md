This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Exhibition: Adding New Works

This project includes an Exhibition page (`/exhibition`) that displays a gallery of creative works. Works can be added easily using the CLI or by editing Markdown files.

### Method 1: Using the CLI (Recommended)

Run the interactive CLI to add a new work:

```bash
pnpm run add:exhibit
```

The CLI will prompt you for:
- Title
- Type (music/video/art/book/article)
- Cover image URL or path
- Tags (comma-separated)
- Release date
- Links (Spotify, YouTube, etc.)
- Preview video URL
- Mood tags

This will create a new Markdown file in `content/exhibits/`.

### Method 2: Manual File Creation

1. Create a new `.md` file in `content/exhibits/`
2. Add frontmatter with the work metadata:

```markdown
---
title: "Your Work Title"
type: "music"
cover: "/works/covers/your-image.jpg"
tags:
  - "tag1"
  - "tag2"
releasedAt: "2025-02-07"
weight: 100
links:
  listen: "https://open.spotify.com/..."
  watch: ""
  read: ""
  nft: ""
previewUrl: ""
moodTags:
  - "静けさ"
  - "希望"
---

# Your Work Title

Optional description or metadata.
```

### Building and Deploying

After adding works via either method:

```bash
# Build the exhibits (converts MD to JSON)
pnpm run build:exhibits

# Test locally
pnpm dev

# Commit and deploy
git add .
git commit -m "Add new exhibition work"
git push
```

The build script (`scripts/build-exhibits.ts`) will automatically merge new works from `content/exhibits/*.md` into `public/works/works.json`.


