#!/bin/bash

echo "🚀 Publishing Consilience Nuclear..."

# Push to GitHub (triggers auto-deploy)
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy: $(date)"
git push origin main

echo "🚂 Railway will auto-deploy backend from GitHub"
echo "🌐 Netlify will auto-deploy frontend from GitHub"
echo "✅ Deployment triggered via GitHub!"
echo "📊 Check Railway dashboard and Netlify dashboard for deployment status"