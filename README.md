# Tably

AI-powered receipt splitting for groups.

Tably transforms receipt images into structured bill data using OCR and AI-assisted parsing, allowing groups to split restaurant bills without manual calculations or spreadsheets.

Built with React Native, PostgreSQL, AWS, and modern LLM infrastructure.

<p align="center">
  Website • Documentation • Report Bug • Request Feature
</p>

---

## Features

### Receipt Processing

- Upload receipt images from camera or photo library
- Receipt preview before processing
- Receipt history and persistence
- Cloud-backed storage

### OCR Pipeline

- AWS Textract integration
- Merchant extraction
- Line item extraction
- Tax extraction
- Total extraction
- Structured receipt parsing

### AI Receipt Intelligence

- OCR error correction
- Receipt normalization
- Missing field recovery
- Invalid total detection
- Confidence scoring
- Structured JSON generation

### Splitting Engine

- Even Split
- Itemized Split
- Hybrid Split
- Shared item support
- Tax allocation
- Tip allocation
- Rounding correction

### Authentication

- Email registration
- Secure login
- JWT authentication
- Password reset via email
- Single-use verification codes
- Session persistence

---

## Architecture

```text
┌──────────────────────┐
│  React Native Client │
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│ Express API Backend  │
└──────────┬───────────┘
           │ Prisma ORM
           ▼
┌──────────────────────┐
│ PostgreSQL Database  │
└──────────────────────┘
```

Supporting services:

```text
Receipt Upload
      │
      ▼
Amazon S3
      │
      ▼
AWS Textract
      │
      ▼
OpenAI Processing
      │
      ▼
Normalized Receipt Data
      │
      ▼
Split Engine
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native |
| Framework | Expo |
| Language | TypeScript |
| Backend | Node.js |
| API | Express |
| ORM | Prisma |
| Database | PostgreSQL |
| OCR | AWS Textract |
| AI | OpenAI API |
| Storage | Amazon S3 |
| Email | Amazon SES |
| DNS | Cloudflare |
| Infrastructure | AWS |

---

## Database Model

```text
User
│
├── SplitSession
│   ├── Participants
│   ├── Receipt
│   ├── ReceiptItems
│   └── Assignments
│
├── PasswordResetCode
│
└── UserSession
```

---

## Security

| Feature | Status |
|---------|--------|
| bcrypt password hashing | ✅ |
| JWT authentication | ✅ |
| SHA256 reset code hashing | ✅ |
| Single-use reset codes | ✅ |
| Expiring reset codes | ✅ |
| Rate limiting | ✅ |
| DKIM email signing | ✅ |
| SPF validation | ✅ |
| DMARC support | ✅ |

---

## Current Progress

### Infrastructure

- ✅ AWS SES integration
- ✅ Cloudflare DNS configuration
- ✅ PostgreSQL deployment
- ✅ Prisma integration
- ✅ S3 integration

### Authentication

- ✅ Registration
- ✅ Login
- ✅ Password reset
- ✅ Email delivery
- ✅ Secure reset flow

### Receipt Pipeline

- ✅ Receipt upload
- ✅ OCR extraction
- ✅ AI normalization
- ✅ Structured receipt output

### Bill Splitting

- ✅ Even split
- ✅ Itemized split
- ✅ Hybrid split
- ✅ Tax allocation
- ✅ Tip allocation

### In Progress

- [ ] Receipt assignment improvements
- [ ] Receipt editing workflow
- [ ] Shareable summaries
- [ ] Payment tracking

### Planned

- [ ] Stripe Checkout
- [ ] Apple Pay
- [ ] Group settlement tracking
- [ ] Expense analytics
- [ ] Multi-currency support

---

## Example Receipt Output

```json
{
  "merchant": "In-N-Out Burger",
  "subtotal": 42.15,
  "tax": 3.64,
  "tip": 8.00,
  "total": 53.79,
  "items": [
    {
      "name": "Double Double",
      "price": 7.25
    },
    {
      "name": "Fries",
      "price": 2.95
    }
  ]
}
```

---

## Repository Structure

```text
mobile/
├── app/
├── screens/
├── components/
└── services/

server/
├── routes/
├── controllers/
├── middleware/
├── services/
├── prisma/
└── utils/
```

---

## Research

Tably is also being used as a benchmarking platform for evaluating multimodal AI models on receipt understanding tasks.

Current evaluation areas include:

- extraction accuracy
- processing latency
- cost per receipt
- OCR robustness
- multilingual receipt performance
- low quality image handling

---

## Screenshots

Coming soon.

---

## License

MIT
