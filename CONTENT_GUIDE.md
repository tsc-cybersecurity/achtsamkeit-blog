# Content Authoring Guide

## Creating a New Post

### Option A: Markdown (technical authors)

Create a new `.md` file in `src/content/blog/`. Use this front matter template:

```markdown
---
title: 'Your Post Title'
description: 'A brief summary for SEO and previews.'
pubDate: '2026-04-07'
author: 'Your Name'
category: 'Mindfulness'
tags: ['tag1', 'tag2']
draft: true
---

Your content here in Markdown.
```

### Option B: Decap CMS (non-technical authors)

Visit `/admin` on the live site to use the visual editor. Log in with your Git credentials, create or edit posts through the UI, and publish when ready.

## Front Matter Fields

| Field         | Required | Description                                                       |
| ------------- | -------- | ----------------------------------------------------------------- |
| `title`       | Yes      | Post title                                                        |
| `description` | Yes      | Short summary for SEO and card previews                           |
| `pubDate`     | Yes      | Publication date (`YYYY-MM-DD`)                                   |
| `updatedDate` | No       | Last updated date                                                 |
| `heroImage`   | No       | Path to hero image (relative to `src/`)                           |
| `author`      | No       | Author name (defaults to "Team")                                  |
| `category`    | No       | One of: Mindfulness, Meditation, Spirituality, Wellness, Practice |
| `tags`        | No       | Array of tag strings                                              |
| `draft`       | No       | Set `true` to hide from production (visible in dev)               |

## Draft/Publish Workflow

1. Create a post with `draft: true`
2. Preview locally with `npm run dev` — drafts are visible in development
3. When ready, set `draft: false` and commit
4. Drafts are automatically excluded from production builds and RSS

## Categories

- **Mindfulness** — present-moment awareness practices
- **Meditation** — guided and structured meditation techniques
- **Spirituality** — spiritual growth and exploration
- **Wellness** — holistic health and well-being
- **Practice** — practical exercises and routines

## Content Preview

- **Local**: Run `npm run dev` and visit `http://localhost:4321`
- **Decap CMS**: Use the editorial workflow preview pane at `/admin`
- **Vercel**: Each PR creates a preview deployment automatically
