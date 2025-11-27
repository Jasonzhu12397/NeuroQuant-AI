# NeuroQuant AI - Full Stack Edition

NeuroQuant is a sophisticated quantitative trading simulator and AI analysis tool. This version runs as a full-stack application with a Node.js backend to handle data fetching (bypassing CORS) and AI API proxying.

## 🚀 Deployment Guide

### Option 1: Docker Compose (Easiest)
1. Install Docker and Docker Compose.
2. Run:
   ```bash
   docker-compose up -d --build
   ```
3. Access at `http://localhost:3000` (or your server IP).

### Option 2: Kubernetes (K8s)
1. Build and push your image:
   ```bash
   docker build -t your-registry/neuroquant:latest .
   docker push your-registry/neuroquant:latest
   ```
2. Update `k8s/deployment.yaml` with your image name.
3. Apply:
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

### Option 3: Helm Chart
1. Update `charts/neuroquant/values.yaml` with your image.
2. Install:
   ```bash
   helm install my-neuroquant ./charts/neuroquant
   ```

### Option 4: Linux Server (Manual)
1. Install Node.js (v18+).
2. Upload code to server.
3. Install dependencies: `npm install`
4. Build frontend: `npm run build`
5. Start server: `node server.js` or use PM2: `pm2 start server.js --name neuroquant`

---

## 📱 WeChat / Alipay Mini Program Integration

To run this app inside a WeChat or Alipay Mini Program, you must use the **WebView** component.

### Prerequisites
1. You must deploy this app to a server with a valid **HTTPS** domain (e.g., `https://api.yourdomain.com`).
2. Login to WeChat Official Accounts Platform (mp.weixin.qq.com).
3. Go to **Development Management -> Development Settings**.
4. Add your domain to **Business Domain** (业务域名). You will need to upload a verification file to your server's `dist/` root.

### Mini Program Code
In your Mini Program project (using WeChat DevTools):

**pages/index/index.wxml**:
```xml
<web-view src="https://api.yourdomain.com"></web-view>
```

That's it! The app will run full-screen inside the Mini Program.