![AWS](https://img.shields.io/badge/AWS-Elastic_Beanstalk-orange)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Proxy-F38020)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-22-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-blue)

# DEPLOYMENT.md

# Tably Production Deployment

This document describes how the Tably backend is deployed to production.

---

# Architecture

```
React Native App
        │
 HTTPS
        │
Cloudflare
        │
HTTPS (Origin CA)
        │
AWS Elastic Beanstalk
        │
Nginx
        │
Node.js + Express
        │
Prisma
        │
PostgreSQL
```

---

# Tech Stack

Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

Infrastructure
- AWS Elastic Beanstalk
- AWS Systems Manager Parameter Store
- Cloudflare
- Cloudflare Origin CA
- Nginx

External Services
- AWS Textract
- OpenAI
- Resend

---

# Production URLs

API

```
https://api.usetably.org
```

Health Check

```
https://api.usetably.org/health
```

---

# Repository Layout

```
server/

├── dist/
├── prisma/
├── .platform/
├── .ebextensions/
├── package.json
└── package-lock.json
```

---

# Environment Variables

Managed through Elastic Beanstalk Environment Properties.

Example:

```
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
RESEND_API_KEY=
FROM_EMAIL=
CLIENT_URL=
```

Secrets are **not committed** to Git.

---

# TLS

HTTPS is terminated at Nginx running on the Elastic Beanstalk instance.

Cloudflare Origin Certificates are stored securely in AWS Systems Manager Parameter Store.

```
/tably/ssl/origin-cert

/tably/ssl/origin-key
```

During deployment, certificates are automatically installed through Elastic Beanstalk hooks.

No certificates are stored in Git.

---

# IAM Permissions

Elastic Beanstalk EC2 role requires:

```
ssm:GetParameter

ssm:GetParameters
```

for

```
arn:aws:ssm:us-east-1:<ACCOUNT_ID>:parameter/tably/ssl/origin-cert

arn:aws:ssm:us-east-1:<ACCOUNT_ID>:parameter/tably/ssl/origin-key
```

---

# Elastic Beanstalk Hooks

Predeploy

```
.platform/hooks/predeploy/
```

Purpose

- Download Origin Certificate
- Download Private Key
- Install certificates
- Set file permissions

Postdeploy

```
.platform/hooks/postdeploy/
```

Purpose

- Validate nginx configuration
- Reload nginx

---

# Nginx

HTTPS configuration is located in

```
.platform/nginx/conf.d/https.conf
```

Features

- TLS 1.2+
- Cloudflare Origin Certificate
- Reject unknown TLS handshakes
- Reverse proxy to Express

---

# Deployment

Generate Prisma client

```bash
npx prisma generate
```

Compile TypeScript

```bash
npm run build
```

Create deployment archive

```bash
zip -r deploy.zip \
dist \
prisma \
package.json \
package-lock.json \
.platform \
.ebextensions
```

Upload

Elastic Beanstalk

→ Upload and Deploy

---

# Verification

Health endpoint

```bash
curl https://api.usetably.org/health
```

Expected response

```json
{
  "status": "ok",
  "service": "tably-server"
}
```

Verify

- Login
- Registration
- Password reset
- Receipt upload
- Textract OCR
- OpenAI receipt repair
- Split session creation

---

# Rollback

Elastic Beanstalk

Application Versions

Select previous version

Deploy

No database rollback is required unless schema migrations changed.

---

# Monitoring

Elastic Beanstalk

- Events
- Health
- Logs

Useful logs

```
/var/log/eb-engine.log

/var/log/eb-hooks.log

/var/log/web.stdout.log

/var/log/nginx/error.log
```

---

# Security

- HTTPS enforced
- Cloudflare proxy enabled
- Origin Certificate stored in SSM
- IAM least privilege
- Secrets excluded from Git
- Environment variables managed by Elastic Beanstalk

---

# Release History

v1.0-production-https

- Initial production deployment
- HTTPS via Cloudflare Origin CA
- Automated TLS installation
- Nginx reverse proxy
- Elastic Beanstalk deployment hooks
