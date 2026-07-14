# Tably

Split restaurant bills from a receipt photo.

Tably is a React Native application that uses OCR and LLM-assisted parsing to extract receipt data and calculate what each diner owes, including tax, tip, and shared items.

## Features

- Receipt photo upload
- OCR extraction using AWS Textract
- LLM-assisted receipt correction
- Even split
- Itemized split
- Hybrid split with shared items
- Receipt history
- User accounts and authentication
- Password reset via email

## Stack

Frontend:

- React Native
- Expo
- TypeScript

Backend:

- Node.js
- Express

Infrastructure:

- PostgreSQL
- Prisma
- AWS Elastic Beanstalk
- AWS RDS
- AWS S3
- AWS SES
- AWS Textract

AI:

- OpenAI API

## Architecture

```text
Mobile App
    ↓
Express API
    ↓
Prisma
    ↓
PostgreSQL
```

External services:

```text
Textract → OCR
OpenAI → receipt normalization
SES → transactional email
S3 → receipt storage
```

## Development Status

Implemented:

- Authentication
- Password reset flow
- Receipt upload
- OCR extraction
- Cloud persistence
- Session history

In progress:

- Receipt assignment workflow
- Receipt editing
- Shareable summaries

Planned:

- Stripe payments
- Apple Pay
- Group settlement tracking

## Running locally

```bash
git clone https://github.com/<user>/tably
cd tably
```

Backend:

```bash
cd server
npm install
npm run dev
```

Mobile:

```bash
cd app
npm install
npx expo start
```
