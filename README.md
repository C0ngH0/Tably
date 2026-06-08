SplitSnap Product Roadmap

Project Overview

Product Name: SplitSnap
Product Vision: SplitSnap is a mobile application that simplifies group dining payments by allowing users to scan restaurant receipts, automatically extract receipt information using AI, assign items to diners, calculate exact amounts owed, and collect payments through integrated payment processing.

Problem Statement: When dining in groups, one person often pays the restaurant bill and must manually determine how much each guest owes. Existing solutions frequently require manual entry, do not handle itemized receipts well, and provide limited support for tracking or collecting repayments.

=> SplitSnap aims to automate receipt processing and streamline repayment collection.

Target Users

* Friends dining in groups
* College students
* Families
* Coworkers
* Event organizers
* Frequent restaurant patrons

Primary Value Proposition

Take a picture of a receipt and instantly determine exactly how much each person owes, including tax, tip, and shared items.


Technology Stack

Mobile Application
* React Native
* Expo
* TypeScript

Backend
* Node.js
* Express.js

Database
* PostgreSQL
* Prisma ORM

Storage
* AWS S3

OCR and Receipt Processing
* AWS Textract

AI Processing
* OpenAI API

Authentication
* Supabase Auth

Payments
* Stripe Checkout
* Stripe Webhooks
* Apple Pay (future release)

Deployment
* Vercel (backend)
* Expo Application Services (EAS)

Development Roadmap

Phase 1 - Core Bill Splitting Engine

Objective: Create the foundational bill splitting functionality without AI or payment integration.

Features
* Create split session
* Add participants
* Add receipt items manually
* Assign items to individuals
* Assign items to multiple people
* Even split mode
* Itemized split mode
* Hybrid split mode
* Tax allocation
* Tip allocation
* Rounding correction

Success Criteria: Users can manually recreate a restaurant bill and accurately calculate each person’s amount owed.

Deliverables
* Functional mobile interface
* Accurate split calculations
* Results summary screen

Status: Done✅

⸻

Phase 2 - Usability and Persistence

Objective: Improve user experience and allow users to return to previous splits.

Features
* Edit participant
* Delete participant
* Edit item
* Delete item
* Input validation
* Save split locally
* View split history
* Reopen split
* Delete split history
* Share split summary

Success Criteria: Users can reliably use SplitSnap without losing data.

Deliverables
* Local storage integration
* Split history screen
* Share functionality

Status: Done✅

⸻

Phase 3 - Receipt Image Capture

Objective: Allow users to attach actual restaurant receipts.

Features
* Camera integration
* Photo library upload
* Receipt image preview
* Receipt image storage
* Session image attachment

Success Criteria: Users can create a split directly from a receipt image.

Deliverables
* Camera workflow
* Receipt upload workflow

Status: In Progress

⸻

Phase 4 - Receipt Extraction Pipeline

Objective: Automatically extract receipt data from uploaded images.

Features
* AWS Textract integration
* Receipt OCR processing
* Structured receipt parsing
* Item extraction
* Tax extraction
* Total extraction
* Restaurant name extraction

Success Criteria: Uploaded receipts automatically populate itemized bill data.

Deliverables
* OCR pipeline
* Receipt processing service
* Structured JSON output

Status: Planned

⸻

Phase 5 - AI Receipt Intelligence

Objective: Improve extraction quality and reduce user corrections.

Features
* OpenAI structured parsing
* Receipt validation
* Missing item detection
* Data normalization
* Error correction suggestions
* Confidence scoring

Success Criteria: Most receipts require minimal manual corrections.

Deliverables
* AI parsing service
* Structured extraction pipeline

Status: Planned

⸻

Phase 6 - Advanced Assignment Experience

Objective: Make assigning receipt items quick and intuitive.

Features
* One-tap assignment
* Multi-select assignment
* Shared item shortcuts
* Running totals
* Participant avatars
* Assignment visualization

Success Criteria: Large receipts can be split efficiently.

Deliverables
* Enhanced assignment workflow
* Improved mobile experience

Status: Planned

⸻

Phase 7 - Payment Tracking

Objective: Track repayment progress after the bill is split.

Features
* Payment status
* Unpaid status
* Pending status
* Paid status
* Remaining balance
* Collection progress
* Settlement dashboard

Success Criteria: Hosts can track who has paid and who still owes money.

Deliverables
* Payment tracking system
* Collection progress indicators

Status: Planned

⸻

Phase 8 - Stripe Payment Collection

Objective: Allow guests to pay their portion directly through SplitSnap.

Features
* Stripe Checkout integration
* Unique payment links
* Guest payment portal
* Payment confirmation
* Webhook processing
* Automatic payment status updates

Success Criteria: Guests can repay the bill through generated payment links.

Deliverables
* Stripe integration
* Payment backend
* Webhook service

Status: Planned

⸻

Phase 9 - Apple Pay Integration

Objective: Provide native payment experiences for iOS users.

Features
* Apple Pay support
* Stripe PaymentSheet
* Native checkout experience

Success Criteria: Users can repay bills through Apple Pay.

Deliverables
* Apple Pay implementation
* Native payment flow

Status: Future Release

⸻

Phase 10 - Production Release

Objective: Prepare SplitSnap for public launch.

Features
* Performance optimization
* Bug fixes
* Security review
* Analytics
* Error monitoring
* App Store assets
* Landing page
* Documentation

Success Criteria: Application is stable and ready for public distribution.

Deliverables
* App Store submission
* Production deployment
* Marketing materials

Status: Future Release

⸻
Problem: Group dining often creates friction when one person pays the bill and needs to collect money from everyone else.

Common issues include:
- Uneven spending between diners
- Shared appetizers and desserts
- Tax and tip calculations
- Manual Venmo requests
- Tracking who has paid

=> SplitSnap aims to automate this workflow.

---

Features

Even Split: Split the entire bill equally among all participants.

Example:

  Total Bill: $120
  
  Participants:
  - Cong
  - Alex
  - Brian
  
  Result:
  
  Cong: $40.00  
  Andy: $40.00  
  Bob: $40.00

---

Itemized Split

Assign each item to a specific participant.

Example:

  Cong:
  - Burger ($18)
  - Drink ($4)
  
  Alex:
  - Steak ($30)
  - Shake ($8)
  
  Tax is distributed proportionally based on food subtotal.
  
  Tip is distributed evenly across participants.

---

Hybrid Split

Supports shared items.

Example:

  Cong:
  - Burger
  
  Andy:
  - Steak
  
  Shared:
  - Fries
  - Nachos
  - Dessert
  
  Shared items are divided evenly among assigned participants.

---

Receipt Upload

Users can:
- Take a photo of a receipt
- Upload a receipt from their photo library
- Preview the receipt before processing

---

Tech Stack

### Mobile

- React Native
- Expo
- TypeScript

### Backend

- Node.js
- Express

### Database

- PostgreSQL
- Prisma

### OCR

- AWS Textract

### AI Processing

- OpenAI API

### Payments

- Stripe Checkout
- Apple Pay

---

## Roadmap

### Phase 1
Core Bill Splitting Engine
- Even Split
- Itemized Split
- Hybrid Split
- Tax Allocation
- Tip Allocation
- Rounding Correction

Status: Done✅

### Phase 2
Receipt Capture
- Camera Support
- Photo Upload
- Receipt Preview

Status: Done✅

### Phase 3
OCR Extraction
- Receipt Processing
- AWS Textract Integration
- Structured Receipt Data

Status: Done✅

### Phase 4
AI Receipt Intelligence
- Item Extraction
- Tax Detection
- Total Detection
- Receipt Validation

Status: Planned

### Phase 5
Payment Collection
- Payment Tracking
- Stripe Checkout Links
- Collection Progress

Status: Planned

### Phase 6
Apple Pay
- Native Payment Experience

Status: Planned

---

## Future Enhancements
- Group Invitations
- Receipt History
- Expense Analytics
- Friend Profiles
- Cloud Synchronization
- Multi-Currency Support
- Business Expense Reports

---

## Screenshots

Screenshots will be added as development progresses.

---

## Installation

Clone the repository: bash git clone https://github.com/YOUR_USERNAME/SplitSnap.git 

Install dependencies: bash npm install 

Start Expo: bash npx expo start 

Run on iOS: bash Press i in the Expo terminal 

Or scan the QR code using Expo Go.

---

## Motivation

SplitSnap was created as a portfolio project to explore:
- Mobile application development
- React Native
- AI-assisted document processing
- OCR systems
- Payment workflows
- Product design and user experience

The long-term goal is to create a seamless bill-splitting experience that can handle everything from receipt scanning to payment collection.
* Finish itemized split mode
* Finish hybrid split mode
* Implement tax allocation
* Implement tip allocation
* Implement rounding correction
* Improve calculation accuracy
* Validate edge cases
Definition of Done

A group can manually enter a restaurant bill and SplitSnap correctly calculates what every participant owes.
