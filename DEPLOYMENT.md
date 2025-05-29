# Cloudflare Pages Deployment Guide

This guide will help you deploy the surus blog to Cloudflare Pages.

## Prerequisites

1. A Cloudflare account
2. This GitHub repository
3. A GitHub personal access token with repository read permissions

## Deployment Steps

### 1. Connect Repository to Cloudflare Pages

1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** in the sidebar
3. Click **"Create a project"**
4. Select **"Connect to Git"**
5. Choose your GitHub repository
6. Click **"Begin setup"**

### 2. Configure Build Settings

Use these settings in the Cloudflare Pages setup:

```
Production branch: main
Build command: npm run build
Build output directory: out
Root directory: (leave empty)
```

### 3. Set Environment Variables

In your Cloudflare Pages project settings, add these environment variables:

```bash
# Required
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_REPO_OWNER=surus
GITHUB_REPO_NAME=blog-articles

# Optional (for optimization)
NODE_VERSION=18
NEXT_TELEMETRY_DISABLED=1
```

### 4. Custom Domain (Optional)

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **"Set up a custom domain"**
3. Enter: `blog.surus.dev`
4. Follow the DNS configuration steps

### 5. Deploy

1. Click **"Save and Deploy"**
2. Your site will be available at: `https://your-project-name.pages.dev`
3. Once custom domain is configured: `https://blog.surus.dev`

## Build Process

The deployment uses:
- **Static Export**: Next.js generates static files
- **No Server**: Fully static, no Node.js runtime needed
- **Global CDN**: Served from Cloudflare's edge network
- **Automatic Builds**: Deploys on every push to main branch

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Verify your GitHub token has repository read permissions
- Ensure the repository name and owner are correct

### Content Not Loading
- Verify GitHub token permissions
- Check if the repository `blog-articles` exists and contains markdown files
- Review build logs for any API rate limiting issues

### Performance Issues
- The app includes Transformers.js which creates large bundles
- Consider implementing code splitting if needed
- Monitor Cloudflare's bundle size limits (25MB)

## Features Enabled

✅ **Static Site Generation**: Pre-rendered at build time  
✅ **GitHub Integration**: Fetches markdown articles from repository  
✅ **SEO Optimized**: Meta tags, sitemap, robots.txt  
✅ **Global CDN**: Fast loading worldwide  
✅ **Automatic SSL**: HTTPS enabled by default  
✅ **Edge Analytics**: Built-in performance monitoring  

## Post-Deployment

After successful deployment:
1. Test all article pages load correctly
2. Verify SEO meta tags are working
3. Check sitemap.xml is accessible
4. Test theme toggle functionality
5. Confirm GitHub content fetching works

Your blog is now live at https://blog.surus.dev! 🎉
