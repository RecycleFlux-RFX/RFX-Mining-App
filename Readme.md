## RecycleFlux (RFX) Platform Documentation

Welcome to the RecycleFlux (RFX) project documentation. RecycleFlux is a gamified platform that rewards users for recycling, learning about sustainability, and participating in environmental campaigns through cryptocurrency incentives (RFX tokens). This full-stack application combines blockchain technology, interactive games, educational content, and administrative tools to promote eco-friendly actions.

This README provides a comprehensive overview of the entire ecosystem, including frontend components, backend APIs, features, technical implementation, setup instructions, and more. It is designed to be detailed and understandable for developers, helping with design, creation, maintenance, error finding, and fixing. The documentation is organized into sections for easy navigation.




### Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technical Stack](#technical-stack)
- [Frontend Documentation](#frontend-documentation)
  - [Super Admin Dashboard](#super-admin-dashboard)
  - [Admin Dashboard Components](#admin-dashboard-components)
  - [RFX Platform - React Components Documentation](#rfx-platform---react-components-documentation)
  - [Campaign Management Application](#campaign-management-application)
  - [RecycleFlux Ecosystem Frontend](#recycleflux-ecosystem-frontend)
  - [RecycleFlux (RFX) Frontend Details](#recycleflux-rfx-frontend-details)
- [Backend Documentation](#backend-documentation)
  - [RFX Mining App Backend](#rfx-mining-app-backend)
- [Installation and Setup](#installation-and-setup)
- [API Integration](#api-integration)
- [Environment Variables](#environment-variables)
- [Security Notes](#security-notes)
- [Error Handling and Debugging](#error-handling-and-debugging)
- [Contribution Guidelines](#contribution-guidelines)
- [Deployment Recommendations](#deployment-recommendations)

## Project Overview

RecycleFlux is an interactive platform that gamifies environmental actions. Users earn RFX tokens by participating in recycling games, trivia challenges, campaigns, and more. The system includes user-facing interfaces, admin dashboards for management, and a robust backend for data handling and authentication.

Core elements:
- **Interactive Recycling Games**: Sort waste, earn points, and get rewards.
- **Educational Trivia**: Learn about blockchain and sustainability.
- **NFT Rewards System**: Collect digital assets for achievements.
- **Crypto Incentives**: RFX tokens for eco-friendly actions.
- **Administrative Tools**: Multi-level admin dashboards for oversight.

The platform supports multi-level authentication (regular users, admins, super admins) and integrates blockchain for token management.

## Key Features

- **User Features**:
  - Join campaigns, complete tasks, upload proofs, and earn tokens.
  - Play games with leaderboards, streaks, and bonuses.
  - View wallet balances, transactions, and rankings.
  - Onboarding flows for new users.
  - Referral programs and social sharing.

- **Admin Features**:
  - Manage users, campaigns, admins, and analytics.
  - Verify proofs, approve tasks, and handle security.
  - Multi-level access: Regular admins and super admins with passcode verification.

- **Gamification**:
  - Streaks, combos, time bonuses, and daily challenges.
  - Progress tracking, statistics, and global impact metrics.

- **Security**:
  - JWT authentication, rate limiting, password hashing.
  - Protected routes and role-based access control.

- **Analytics and Visualization**:
  - Charts for user growth, activity, and campaign metrics.
  - Interactive dashboards with real-time data.

## Technical Stack

- **Frontend**:
  - React.js (with hooks: useState, useEffect, useRef, etc.)
  - React Router for navigation.
  - Tailwind CSS for responsive styling.
  - Chart.js for data visualization.
  - Lucide React and React Icons for icons.
  - Axios for API requests.
  - SweetAlert2 for notifications.
  - React Modal and React Tabs for UI elements.
  - Additional: date-fns, react-modal, jwt-decode, networkx (for graphs if needed).

- **Backend**:
  - Node.js with Express.js.
  - MongoDB for database.
  - JWT for authentication.
  - Bcrypt for password hashing.
  - Middleware for rate limiting and security.

- **Other Tools**:
  - Vite for development (frontend).
  - PM2/Nodemon for backend server management.
  - Environment variables for configuration.

No additional package installations beyond defaults; use provided libraries.

## Frontend Documentation

The frontend is built with React and focuses on responsive, interactive UIs. Below are detailed sections from various components and dashboards.

### Super Admin Dashboard

The Super Admin Dashboard is a comprehensive management interface built with React, designed for administrators with elevated privileges to oversee and manage the entire platform.

#### Features

##### Dashboard Overview
- Displays key metrics (total users, active users, campaigns, admins).
- Visual charts for user growth and activity.
- Quick stats with trends and percentages.

##### User Management
- View all user accounts in a paginated table.
- Suspend/activate users with one click.
- See user details (username, email, join date, status).

##### Campaign Management
- View all campaigns with status and participation data.
- Delete campaigns when needed.
- Track campaign progress with visual indicators.

##### Admin Management
- View all admin accounts.
- Create new admins with auto-generated temporary passwords.
- Reset admin passwords.
- Deactivate admin accounts.

##### Analytics
- Detailed user activity charts.
- Campaign participation metrics.
- Data visualization with interactive charts.

##### Security Features
- Super admin verification with passcode.
- JWT token authentication.
- Error boundaries for chart rendering.
- Protected routes.

#### Technical Implementation

##### Dependencies
- React (with hooks: useState, useEffect, useRef).
- React Router (for navigation).
- Chart.js (for data visualization).
- jwt-decode (for token verification).
- Lucide React (for icons).

##### Key Components
- **ErrorBoundary**: Catches and displays chart rendering errors gracefully.
- **ChartComponent**: Reusable chart wrapper that handles Chart.js initialization and cleanup.
- **Tab-based navigation**: Dashboard, Users, Campaigns, Admins, Analytics.

##### Data Handling
- Fetches data from API endpoints on component mount.
- Implements refresh functionality for each tab.
- Handles pagination for user lists.
- Manages loading states and errors.

##### Authentication Flow
1. Checks for valid JWT token.
2. Verifies super admin status.
3. Requires additional passcode verification for super admin email.
4. Redirects unauthorized users.

#### Usage

1. **Access Control**: Only users with `isSuperAdmin` flag or the designated super admin email can access.
2. **Navigation**: Use the sidebar (desktop) or top tabs (mobile) to switch between sections.
3. **Actions**:
   - Create new admins via the "Add Admin" button.
   - Reset passwords or deactivate admins via action buttons.
   - Suspend/activate users via the status toggle.
   - Delete campaigns via the delete button.
4. **Data Refresh**: Click the refresh button in each section to fetch latest data.

#### Error Handling
- Displays user-friendly error messages.
- Handles token expiration (redirects to login).
- Gracefully handles API failures.
- Provides loading indicators during data fetch.

#### Styling
- Uses Tailwind CSS for responsive design.
- Mobile-friendly layout with adaptive sidebar.
- Consistent color scheme and visual hierarchy.

#### Environment Variables
Requires the following environment variables:
- `VITE_API_BASE_URL`: Base URL for API endpoints.
- `VITE_SUPER_ADMIN_EMAIL`: Email address of the primary super admin.

#### Security Notes
- All API requests include the auth token in headers.
- Sensitive operations (password reset, deactivation) require confirmation.
- Temporary passwords are displayed only once after creation.

### Admin Dashboard Components

This repository contains React components for an admin dashboard system with multi-level authentication and campaign management features.

#### Components Overview

##### 1. AdminAuthVerification.jsx
- Password verification component for admin access.
- Features:
  - Password input with validation.
  - Error handling.
  - Loading state.
  - LocalStorage authentication flag management.
  - Redirects to admin dashboard on success.

##### 2. AdminCampaignDashboard.jsx
- Comprehensive campaign management dashboard.
- Features:
  - Campaign CRUD operations.
  - Task management.
  - Proof verification system.
  - Participant tracking.
  - Statistics and analytics.
  - Dark/light mode toggle.
  - Responsive design.
  - Form validation.
  - Image uploads.
  - Bulk actions.

##### 3. AdminDashboard.jsx
- Main admin dashboard component.
- Features:
  - Navigation to campaign management.
  - Logout functionality.
  - Basic admin information display.

##### 4. AdminVerify.jsx
- Admin verification component with two-factor authentication.
- Features:
  - Email display (from localStorage).
  - Password verification.
  - Super admin detection.
  - Error handling.
  - Redirects based on admin level.

##### 5. PasscodeVerify.jsx
- Super admin passcode verification component.
- Features:
  - Secure passcode input.
  - API verification.
  - Error handling.
  - Loading state.
  - Redirects to super admin dashboard.

#### Authentication Flow

1. Regular admin flow:  
   AdminVerify → AdminDashboard → AdminCampaignDashboard

2. Super admin flow:  
   AdminVerify → PasscodeVerify → SuperAdminDashboard

#### Key Features

- **Multi-level authentication**: Regular admin and super admin tiers.
- **Campaign management**: Full CRUD operations for environmental campaigns.
- **Task system**: Create and manage tasks within campaigns.
- **Proof verification**: Review and approve user submissions.
- **Responsive design**: Works on all device sizes.
- **Dark mode**: User-selectable theme.
- **Form validation**: Client-side validation for all forms.
- **Secure storage**: Uses localStorage for auth tokens with proper cleanup.

#### Technical Details

- Built with React and React Router.
- Uses Tailwind CSS for styling.
- Implements modern UI patterns (modals, tabs, cards).
- Includes loading states and error handling.
- Follows REST API patterns for backend communication.

#### Dependencies
- React.
- React Router.
- Lucide React icons.
- React Icons.
- date-fns (for date formatting).
- react-modal.
- react-tabs.
- axios.

### RFX Platform - React Components Documentation

#### Overview

This documentation covers the main React components that make up the RFX platform, including Campaign, Games, Wallet, and Settings pages. Each component is designed with a modern UI and interactive features.

#### Components

##### 1. RFXCampaignPage.jsx

**Description**:  
The Campaign page allows users to join and participate in various environmental campaigns to earn rewards.

**Key Features**:
- View active and completed campaigns.
- Track campaign progress and tasks.
- Earn RFX tokens by completing tasks.
- Upload proof of task completion.
- View global impact statistics.

**Technologies Used**:
- React hooks (useState, useEffect).
- React Router (Link, useLocation, useNavigate).
- Axios for API calls.
- SweetAlert2 for notifications.
- Lucide-react icons.
- Tailwind CSS for styling.

**Usage**:
```jsx
<RFXCampaignPage />
```

##### 2. RFXGamesPage.jsx
**Description**:
The Games page provides a collection of eco-themed games where users can play and earn rewards.

**Key Features**:
- Game categories and filtering.
- Daily challenges.
- Player stats and XP tracking.
- Leaderboards.
- Game cooldown timers.

**Technologies Used**:
- React hooks.
- React Router.
- Custom game icons.
- Tailwind CSS animations.
- Responsive grid layout.

**Usage**:
```jsx
<RFXGamesPage />
```

##### 3. RFXWalletPage.jsx
**Description**:
The Wallet page displays user's RFX token balance and transaction history.

**Key Features**:
- View current balance (with hide/show toggle).
- Transaction history with filtering.
- Earnings breakdown (today, week).
- User ranking.
- Ways to earn more RFX.

**Technologies Used**:
- React hooks.
- React Router.
- Transaction categorization.
- Date formatting utilities.
- Responsive design.

**Usage**:
```jsx
<RFXWalletPage />
```

##### 4. RFXSettingsPage.jsx
**Description**:
The Settings page (currently in development) will allow users to manage their account preferences.

**Key Features**:
- Coming soon placeholder.
- Navigation integration.
- Dark mode toggle.
- Notification settings.
- Account management.

**Technologies Used**:
- React hooks.
- React Router.
- Coming soon overlay.
- Responsive design.

**Usage**:
```jsx
<RFXSettingsPage />
```

#### Common Features
All components share these common elements:
- Navigation: Consistent bottom navigation bar across all pages.
- Authentication: Token-based authentication checks.
- Styling: Unified dark theme with gradient accents.
- Error Handling: Consistent error display and handling.
- Loading States: Visual feedback during data loading.

#### Development Notes
- All components are designed for mobile-first responsive layouts.
- Use environment variables for sensitive configuration.
- Add proper error boundaries in production.
- Implement proper loading states for better UX.

### Campaign Management Application

This is a React application for managing and participating in environmental campaigns, where users can complete tasks to earn rewards (RFX tokens). The application features a modern UI with campaign listings, task management, progress tracking, and social sharing capabilities.

#### Features
- **Campaign Management**:
  - View active, completed, and featured campaigns.
  - Join campaigns and track progress.
  - Detailed campaign information with categories (Ocean, Forest, Air, Community).

- **Task System**:
  - Daily tasks with countdown timers.
  - Multiple task types (social follows, proof uploads, content viewing).
  - Task completion tracking and rewards.

- **User Experience**:
  - Responsive design for all screen sizes.
  - Animated UI elements and transitions.
  - Progress tracking and statistics.
  - Error handling and loading states.

- **Authentication**:
  - Token-based authentication.
  - Protected routes.

#### Technologies Used
- **Frontend**:
  - React.js.
  - React Router.
  - Tailwind CSS.
  - Lucide React (icons).
  - React Icons (social media icons).
  - SweetAlert2 (alerts).
  - Axios (HTTP requests).
  - React Modal.

#### Project Structure
The main application logic is contained in RFXCampaignPage.jsx, which includes:
- Campaign listing and filtering.
- Task management components.
- User authentication and data fetching.
- Modal components for campaign details.
- Navigation and responsive layout.

#### Available Scripts
- `npm start`: Runs the app in development mode.
- `npm test`: Launches the test runner.
- `npm run build`: Builds the app for production.

### RecycleFlux Ecosystem Frontend

#### Key Components

##### 1. Recycling Games

###### Recycle Rush
- Drag-and-drop sorting game with falling waste items.
- Score points by correctly categorizing recyclables.
- Combo multipliers and time bonuses.

###### EcoSort Master
- Multiple difficulty levels for waste categorization.
- Streak bonuses for consecutive correct answers.
- Educational hints for incorrect responses.

##### 2. Blockchain Trivia

###### Trivia Challenge
- Timed quizzes about blockchain and recycling.
- Difficulty-based scoring system.
- Accuracy and streak bonuses.
- Comprehensive explanations for each answer.

##### 3. User Interface

###### RFXVerse Dashboard
- Real-time stats tracking (earnings, CO₂ saved).
- Leaderboard system with rankings.
- Referral program integration.
- News feed with environmental updates.

#### Technical Features
- **React-based frontend** with responsive design.
- **Gamification elements** (streaks, combos, bonuses).
- **Token rewards system** (RFX cryptocurrency).
- **Authentication integration** with JWT.
- **Animated UI components** for enhanced engagement.

### RecycleFlux (RFX) Frontend Details

#### Overview
This documentation covers the frontend components of the RecycleFlux (RFX) application, built with React and Tailwind CSS. The application features user authentication, onboarding flows, gaming interfaces, and admin dashboards.

#### Core Files
**App.jsx**
- Main application router.
- Protected routes for admin/super admin.

Route structure:
```jsx
<Route path="/" element={<RecycleFluxWelcome />} />
<Route path="/dashboard" element={<RFXVerseInterface />} />
<Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/games" element={<RFXGamesPage />} />
<Route path="/campaign" element={<RFXCampaignPage />} />
<Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
```

**ProtectedAdminRoute Component**
- JWT token validation.
- Role-based access control.
- Handles redirects for unauthorized access.

#### Authentication Components
**Login.jsx**
- Features: Email/username and password login, password visibility toggle, remember me, error handling, admin redirection.

**Signup.jsx**
- Features: Full registration form, password strength validation, referral code, passkey generation, terms checkbox.

**Register.jsx (Alternative Signup)**
- Additional: MetaMask wallet integration, two-column layout, visual feedback.

#### Onboarding Flow
**Onboarding.jsx**
- 3-Step Process: Welcome, how RFX Mining works, community stats and CTA.
- Features: Animated progress, responsive, interactive, gradients.

#### Routing Structure
**Public Routes**
- `/` - Welcome page.
- `/login` - Authentication.
- `/signup` - Registration.
- `/onboarding/1` - First-time user flow.

**User Dashboard Routes**
- `/dashboard` - Main interface.
- `/games` - Game portal.
- `/campaign` - Recycling campaigns.
- `/wallet` - Token management.
- `/settings` - Account settings.

**Admin Routes**
- `/admin/dashboard` - Admin console.
- `/admin/super` - Super admin panel.
- `/admin/campaigns` - Campaign management.
- `/admin/verify` - Admin verification.

#### Styling System
**Tailwind CSS Configuration**
- `index.css` for base directives.
- Custom utilities.

**App.css**
- Legacy styles, logo animations, basic cards.

Design System Features:
- Gradients (`bg-gradient-to-br`).
- Backdrop filters (`backdrop-blur-sm`).
- Responsive spacing (`p-4 sm:p-6 lg:p-8`).
- Consistent forms, animated transitions.

#### Component Library
**Common Components:**
- Form inputs with icons.
- Loading states.
- Error/success notifications.
- Protected route wrappers.
- Progress indicators.

**Icon Usage:**
- Lucide React icons.
- Consistent sizing (`w-5 h-5`).
- Semantic coloring.

#### Development Notes
- Environment Variables: `VITE_API_BASE_URL` for backend, JWT secret.
- Dependencies: React Router DOM, JWT Decode, Lucide React, Tailwind CSS, PostCSS.

## Backend Documentation

### RFX Mining App Backend

#### Overview

This backend system powers the RFX Mining Application, providing APIs for user authentication, wallet management, gaming features, campaign participation, and administrative functions. Built with Node.js, Express, and MongoDB.

#### Middleware

**File:** `middleware.js`

- Rate limiting: 500 requests / 40 minutes per IP.
- Request slowing: 500ms delay after 500 requests.
- Whitelisting: Health checks and specific IPs.

#### Authentication

**File:** `authController.js`

Endpoints:
- `POST /signup` → User registration with referral support.
- `POST /login` → User authentication with JWT.
- `POST /check-admin` → Verify admin status.
- `POST /verify-admin` → Admin password verification.
- `POST /verify-super-admin` → Super admin passcode verification.

#### User Management

**File:** `userController.js`

Endpoints:
- `GET /validate-token` → Validate JWT token.
- `GET /profile` → Get user profile with CO₂ savings.
- `GET /network-stats` → Get global recycling stats.
- `GET /referral` → Manage referral links.
- `PUT /wallet` → Update wallet address.
- `POST /claim-reward` → Claim daily rewards.
- `GET /campaigns` → Get user’s campaigns.
- `GET /leaderboard` → View leaderboards.

#### Wallet & Transactions

**File:** `walletController.js`

Endpoints:
- `GET /transactions` → Get transaction history with filters.
- `POST /send` → Send tokens to another user.
- `GET /rank` → Get user’s ranking.

#### Campaign System

Files:
- `campaignController.js` → User-facing.
- `adminCampaignController.js` → Admin-facing.
- `campaignTaskController.js` → Task management.

User Endpoints:
- `GET /campaigns` → Browse available campaigns.
- `GET /campaigns/:id` → Get campaign details.
- `POST /campaigns/:id/join` → Join a campaign.
- `POST /campaigns/:id/tasks/:taskId/proof` → Upload task proof.
- `POST /campaigns/:id/tasks/:taskId/complete` → Complete a task.

Admin Endpoints:
- `POST /admin/campaigns` → Create campaigns.
- `PUT /admin/campaigns/:id` → Update campaigns.
- `DELETE /admin/campaigns/:id` → Delete campaigns.
- `GET /admin/campaigns/proofs` → Review submitted proofs.
- `POST /admin/campaigns/approve` → Approve/reject proofs.

#### Gaming Features

**File:** `gameController.js`

Endpoints:
- `GET /games` → List all available games.
- `GET /games/progress` → Get user’s game progress.
- `POST /games/start` → Start a game session.
- `POST /games/:id/score` → Submit game score.
- `GET /games/:id/leaderboard` → View game leaderboard.
- `POST /games/complete` → Complete a game session.

#### Admin Functions

**File:** `adminController.js`

Endpoints:
- `GET /admin/users` → Manage users (pagination, search).
- `PUT /admin/users/:id/suspend` → Suspend/activate users.
- `GET /admin/admins` → List admins.
- `POST /admin/admins` → Create admin.
- `PUT /admin/admins/:id` → Update admin.
- `DELETE /admin/admins/:id` → Delete admin.
- `POST /admin/admins/:id/reset-password` → Reset admin password.
- `GET /admin/stats` → Platform statistics.

#### Database

**File:** `db.js`

- MongoDB connection with environment variables.
- Keep-alive ping every 30 minutes.
- Error handling and graceful shutdown.

#### Error Handling
- Proper HTTP status codes.
- Detailed error messages (dev mode).
- Consistent response formats.
- Error logging to console.

#### Security Features
- Rate limiting.
- JWT authentication.
- Password hashing (bcrypt).
- Input validation.
- Admin privilege checks.
- Sensitive operation verification.

## Installation and Setup

### Frontend
1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (create `.env`):
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Backend
1. Clone the repository (if separate).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (create `.env`):
   ```
   MONGO_URI=<MongoDB connection string>
   JWT_SECRET=<JWT signing secret>
   SUPER_ADMIN_EMAIL_1=<super admin email>
   SUPER_ADMIN_EMAIL_2=<super admin email>
   SUPER_ADMIN_PASSCODE_1=<super admin passcode>
   FRONTEND_URL=<frontend base URL>
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   Or use Nodemon/PM2 for production.

## API Integration

The frontend connects to the backend at `BASE_URL` (default: http://localhost:3000). Key endpoints include:
- User authentication (/user/validate-token).
- Campaign data (/campaigns).
- User campaigns (/user/campaigns).
- Task completion (/campaigns/:id/tasks/:taskId/complete).
- Proof uploads (/campaigns/:id/tasks/:taskId/proof).
- Game sessions (/games/start, /games/:id/score).

All requests include JWT in headers for protected routes.

## Environment Variables

- Frontend: `VITE_API_BASE_URL`, `VITE_SUPER_ADMIN_EMAIL`.
- Backend: `MONGO_URI`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL_1`, `SUPER_ADMIN_EMAIL_2`, `SUPER_ADMIN_PASSCODE_1`, `FRONTEND_URL`.

## Security Notes

- Use HTTPS in production.
- Implement CORS properly.
- All sensitive operations require confirmation.
- Temporary passwords shown only once.
- Validate inputs to prevent injections.
- Monitor for token expiration and refresh as needed.

## Error Handling and Debugging

- **Frontend**: Use ErrorBoundary for components, display user-friendly messages, handle loading states.
- **Backend**: Log errors, return consistent JSON responses (e.g., { error: "Message" }).
- Common Fixes:
  - Token issues: Check JWT_SECRET match between front/back.
  - API failures: Verify endpoints and CORS.
  - Database: Ensure MongoDB URI is correct; check for connection errors.
- Use console logs in dev; add monitoring tools like Sentry in prod.

## Contribution Guidelines

We welcome contributions! Follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

Focus on clean code, tests, and documentation updates.

## Deployment Recommendations

- **Frontend**: Build with `npm run build`, host on Vercel/Netlify.
- **Backend**: Use Heroku/Railway, with PM2 for process management.
- Database: MongoDB Atlas for cloud hosting.
- Enable HTTPS, set up CI/CD with GitHub Actions.
- Schedule backups and monitor performance.