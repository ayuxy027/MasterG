# EduRAG Backend - Deployment Guide

Quick guide for deploying the EduRAG backend to production.

---

## Prerequisites

- Node.js 18+ installed on server
- MongoDB database (local or cloud like MongoDB Atlas)
- ChromaDB server running
- Domain name (optional, for HTTPS)
- Reverse proxy (nginx recommended)

---

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

### 2. Clone and Install

```bash
# Clone your repository
git clone <your-repo-url>
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### 3. Environment Configuration

```bash
# Create production .env
nano .env
```

Add production values:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/edurag
CHROMA_URL=http://localhost:8000
GROQ_API_KEY=your_production_groq_key
GEMMA_API_KEY=your_production_gemini_key
HUGGINGFACE_API_KEY=your_production_hf_key
```

### 4. Start with PM2

```bash
# Start the application
pm2 start dist/index.js --name edurag-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 5. Configure Nginx (Optional but Recommended)

```bash
sudo nano /etc/nginx/sites-available/edurag
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type';
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/edurag /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 6. Setup SSL (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## MongoDB Atlas Setup (Cloud Database)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist your server IP
5. Get connection string
6. Update `MONGODB_URI` in `.env`

---

## ChromaDB Setup

### Option 1: Docker (Recommended)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Run ChromaDB
docker run -d -p 8000:8000 --name chromadb chromadb/chroma

# Auto-start on boot
docker update --restart unless-stopped chromadb
```

### Option 2: Python Installation
```bash
pip install chromadb
chroma run --path ./chroma_data --port 8000
```

---

## PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs edurag-api

# Restart
pm2 restart edurag-api

# Stop
pm2 stop edurag-api

# Delete from PM2
pm2 delete edurag-api

# Monitor
pm2 monit
```

---

## Environment Variables for Production

```env
PORT=5000
NODE_ENV=production

# MongoDB (use Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/edurag?retryWrites=true&w=majority

# ChromaDB
CHROMA_URL=http://localhost:8000

# API Keys (use production keys)
GROQ_API_KEY=gsk_production_key_here
GEMMA_API_KEY=AIzaSy_production_key_here
HUGGINGFACE_API_KEY=hf_production_key_here
```

---

## Security Checklist

- [ ] `.env` file is not in git repository
- [ ] Using production API keys (not development keys)
- [ ] MongoDB has authentication enabled
- [ ] Server firewall configured (ufw or iptables)
- [ ] Only necessary ports open (80, 443, 22)
- [ ] SSL certificate installed
- [ ] CORS configured for specific frontend domain
- [ ] File upload size limits enforced
- [ ] Rate limiting implemented
- [ ] Error messages don't leak sensitive information
- [ ] Regular backups of MongoDB data
- [ ] PM2 configured for auto-restart
- [ ] Nginx configured as reverse proxy
- [ ] Server kept up-to-date with security patches

---

## Monitoring

### PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Check Endpoint
```bash
# Add to your monitoring tool
curl http://your-domain.com/api/query/health
```

---

## Backup Strategy

### MongoDB Backup
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your_mongodb_uri" --out=/backups/mongo_$DATE
# Delete backups older than 7 days
find /backups -type d -mtime +7 -exec rm -rf {} \;
```

```bash
chmod +x backup.sh
# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /path/to/backup.sh
```

---

## Troubleshooting

**Application won't start**
```bash
pm2 logs edurag-api --lines 50
# Check for errors in logs
```

**MongoDB connection failed**
```bash
# Test connection
mongosh "your_mongodb_uri"
```

**ChromaDB not accessible**
```bash
# Check if running
docker ps | grep chromadb
# Check logs
docker logs chromadb
```

**High memory usage**
```bash
# Restart application
pm2 restart edurag-api
# Check PM2 metrics
pm2 monit
```

**Nginx errors**
```bash
# Check nginx logs
sudo tail -f /var/log/nginx/error.log
# Test configuration
sudo nginx -t
```

---

## Scaling Considerations

### Horizontal Scaling
- Use PM2 cluster mode: `pm2 start dist/index.js -i max`
- Use load balancer (nginx upstream)
- Separate ChromaDB server

### Vertical Scaling
- Increase server resources (RAM, CPU)
- Optimize MongoDB indexes
- Enable Redis caching for frequent queries

### Database Optimization
- Create indexes on frequently queried fields
- Use MongoDB sharding for large datasets
- Regular database maintenance

---

## Updates and Rollbacks

### Deploying Updates
```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild
npm run build

# Restart with zero downtime
pm2 reload edurag-api
```

### Rollback
```bash
# Rollback to previous version
git reset --hard <previous-commit>
npm install
npm run build
pm2 restart edurag-api
```

---

## Cost Estimates

**Free Tier Deployment:**
- MongoDB Atlas: 512MB free
- ChromaDB: Self-hosted (free)
- Server: DigitalOcean $6/month
- Domain: $12/year
- SSL: Free (Let's Encrypt)

**Total**: ~$84/year

**Paid APIs Usage (Estimated):**
- Groq: Free tier sufficient for development
- Gemini: Free tier 60 requests/minute
- HuggingFace: Free tier sufficient

---

## Production Environment Example

```
Internet
   ↓
Nginx (Port 80/443) - SSL Termination
   ↓
PM2 (Port 5000) - Node.js App (4 instances)
   ↓
MongoDB Atlas (Cloud) - Document Storage
ChromaDB (Docker) - Vector Database
```

---

## Support

For deployment issues:
1. Check PM2 logs: `pm2 logs`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Review API documentation: `API_DOCUMENTATION.md`
4. Contact development team

---

**Version:** 3.0.0  
**Last Updated:** November 24, 2025
