# Admin Affiliate Sales Management System

## Project Overview

This project is a comprehensive affiliate sales management system built with React, Vite, and AWS services. It provides separate dashboards for administrators and affiliates, allowing admins to manage affiliates, track sales, and monitor commissions, while affiliates can track their own sales performance and commissions.

## Features

### Admin Features

- Dashboard with sales analytics and affiliate performance metrics
- Add, view, edit, and delete affiliates
- Add, view, and manage admin users
- Track sales and commissions for all affiliates
- View detailed affiliate profiles and performance

### Affiliate Features

- Personalized dashboard showing sales performance
- Commission tracking and reporting
- Add new sales records
- View historical sales data with filtering options

## Tech Stack

- **Frontend**: React.js with Vite, Tailwind CSS
- **State Management**: React Context API
- **Authentication**: AWS Cognito
- **Database**: AWS DynamoDB
- **Visualization**: Tremor charts
- **Utilities**: AWS SDK, date-fns, uuid, react-hot-toast
- **Build Tool**: Vite with HMR (Hot Module Replacement)

## Architecture

The application uses a serverless architecture leveraging AWS services:

1. **Authentication Layer**: AWS Cognito for user authentication and authorization
2. **Data Layer**: AWS DynamoDB for storing affiliate and sales data
3. **Frontend**: React Single Page Application (SPA) built with Vite
4. **API Layer**: Direct AWS SDK calls from the frontend to DynamoDB (using Cognito credentials)

## Database Schema

### Tables

1. **Affiliates Table**

   - id (String) - Primary Key
   - cognitoId (String) - Cognito user ID
   - name (String) - Full name
   - email (String) - Email address
   - address (String) - Physical address
   - phoneNumber (String) - Contact number
   - code (String) - Unique affiliate code
   - link (String) - Referral link
   - basePrice (Number) - Commission percentage
   - createdAt (String) - ISO date
   - updatedAt (String) - ISO date
   - createdBy (String) - Admin who created the affiliate
   - salesCount (Number) - Total number of sales
   - freeDogTagOffer (Boolean) - Whether the affiliate participates in the free dog tag program
   - pumpkinInsuranceOnly (Boolean) - Limit quotes to Pumpkin Insurance only

2. **Sales Table**

   - id (String) - Primary Key
   - affiliateId (String) - Foreign key to Affiliate
   - productName (String) - Name of product sold
   - amount (Number) - Sale amount
   - commission (Number) - Commission amount
   - basePrice (Number) - Commission percentage at time of sale
   - createdAt (String) - ISO date
   - notes (String) - Additional notes
   - status (String) - "pending" or "completed"
   - timestamp (String) - ISO timestamp
   - date (String) - Sale date

3. **Admins Table**
   - id (String) - Primary Key
   - cognitoId (String) - Cognito user ID
   - name (String) - Full name
   - email (String) - Email address
   - phone (String) - Contact number
   - role (String) - Admin role
   - status (String) - Active status
   - createdAt (String) - ISO date

## User Authentication

The system uses AWS Cognito for authentication with two user groups:

1. **Admins**: Full access to all system features
2. **Affiliates**: Limited access to their own sales data

## Installation and Setup

### Prerequisites

- Node.js v14+
- npm v6+
- AWS account with Cognito and DynamoDB set up

### Local Development Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/admin-affiliate-sales.git
cd admin-affiliate-sales
```

2. Install dependencies

```bash
npm install
```

3. Create a .env file in the root directory with your AWS configuration:

```bash
REACT_APP_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_a1WJlHOTP
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-client-id
```

4. Start the development server

```bash
npm run dev
```

### AWS Setup

1. **Create Cognito User Pool**

   - Create a User Pool in AWS Cognito
   - Add app clients with appropriate settings
   - Create two user groups: "admin" and "affiliate"
   - Configure custom attributes as needed

2. **Create DynamoDB Tables**

   - Create Affiliates, Sales, and Admins tables with appropriate schemas

3. **Configure IAM Permissions**
   - Set up appropriate IAM roles for authenticated users
   - Grant permissions for Cognito and DynamoDB operations

## Key Components

### Pages

- **Login.jsx**: User authentication
- **AdminDashboard.jsx**: Main admin dashboard with stats and navigation
- **AffiliateDashboard.jsx**: Affiliate-specific dashboard
- **AddAffiliate.jsx**: Form for adding new affiliates

### Components

- **AffiliatesList.jsx**: Table of affiliates with actions
- **AdminsList.jsx**: Table of admins with actions
- **AddSaleModal.jsx**: Modal for adding new sales
- **SalesTable.jsx**: Table displaying sales data

## Routing and Navigation

The application uses React Router for navigation with protected routes:

- `/login` - Authentication page
- `/admin` - Admin dashboard (protected)
- `/affiliate` - Affiliate dashboard (protected)

## AWS Integration

### Authentication Flow

1. User logs in through Cognito
2. Upon successful authentication, temporary AWS credentials are issued
3. These credentials are used for DynamoDB operations
4. User is redirected to appropriate dashboard based on their group

### Data Operations

- Direct DynamoDB queries using the AWS SDK
- No separate backend/API needed
- Client-side filtering and processing of data

## Best Practices Implemented

1. **Security**

   - Fine-grained IAM permissions
   - Secure authentication flow
   - No hardcoded credentials

2. **Performance**

   - Efficient DynamoDB queries
   - Client-side caching
   - Optimized rendering with React

3. **UX/UI**
   - Responsive design
   - Loading states
   - Error handling
   - Toast notifications

## Development Information

This project was built with Vite, which provides a minimal setup to get React working with HMR and some ESLint rules.

### Available Vite Plugins

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Future Improvements

1. **Features**

   - Payment integration
   - Automated commission payouts
   - Advanced reporting options
   - Email notifications for sales

2. **Technical**
   - Unit and integration tests
   - CI/CD pipeline
   - Backend API with Express/Node.js
   - GraphQL implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details
