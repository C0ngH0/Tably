# Tably

AI-powered receipt splitting for groups.

Tably uses OCR and AI-assisted parsing to extract receipt data, assign items to diners, and calculate exactly what everyone owes.

[Website](https://usetably.org) • [Documentation] • [Report Bug] • [Request Feature]

---

## Features

- Receipt photo upload
- AWS Textract OCR extraction
- AI receipt normalization
- Even split
- Itemized split
- Hybrid split
- Tax and tip allocation
- Receipt history
- Secure authentication

---

## Screenshots

[Hero screenshot here]

[Receipt upload screenshot]

[Assignment workflow screenshot]

[Results screen screenshot]

---

## Example

| Item | Assigned To | Amount |
|------|------------|--------|
| Burger | Cong | $18.00 |
| Fries | Cong, Alex | $4.50 |
| Drink | Alex | $3.00 |

| Person | Final Total |
|--------|-------------|
| Cong | $22.47 |
| Alex | $18.12 |

---

## Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native, Expo |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| OCR | AWS Textract |
| AI | OpenAI API |
| Email | Amazon SES |
| Storage | Amazon S3 |
| Infrastructure | AWS |

---

## Architecture

```text
React Native App
        ↓
Express API
        ↓
Prisma ORM
        ↓
PostgreSQL
