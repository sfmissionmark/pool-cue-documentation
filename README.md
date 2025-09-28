# Pool Cue Documentation App 🎱

[![GitHub](https://img.shields.io/badge/GitHub-sfmissionmark/pool--cue--documentation-blue?logo=github)](https://github.com/sfmissionmark/pool-cue-documentation)

A comprehensive documentation system for pool cue components built with Next.js, Tailwind CSS, and Firebase. This application allows you to document specifications, build processes, machining steps, and assembly notes for various pool cue components.

## Features

- **Component-based Documentation**: Organize documentation by cue components (Ferrules, Tips, Shafts, Joints, Butts, Wraps)
- **Detailed Specifications**: Track dimensions, materials, and build styles
- **Vault Plate Support**: Special handling for ferrules with vault plates
- **Process Documentation**: Record machining steps and assembly procedures
- **Firebase Integration**: Cloud storage with real-time synchronization
- **Offline Support**: Works with browser storage when Firebase isn't configured
- **Modern UI**: Clean, responsive interface with dark mode support
- **Real-time Updates**: Changes sync instantly across devices

## Getting Started

### Quick Start (Browser Storage)

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

The app will work immediately with browser storage!

### Firebase Setup (Optional - 3 minutes)

For cloud storage and real-time sync across devices:

1. **Follow the setup guide**: See `FIREBASE_SETUP.md` for complete instructions
2. **Quick summary**:
   - Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore database
   - Copy config values to `.env.local`
   - Restart the development server

Your data will automatically sync to the cloud! 🔥

## Usage

1. **Select a Component**: From the main page, choose the cue component you want to document
2. **Add Specifications**: Fill out the form with component details including:
   - Name and basic specifications
   - Materials and build style
   - Step-by-step machining instructions
   - Assembly notes and tips
3. **Save and Review**: Your documentation is saved and displayed in an organized format
4. **Edit as Needed**: Click "Edit" on any saved specification to make updates

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React, TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Database**: Firebase Firestore (with localStorage fallback)
- **Fonts**: Geist font family (optimized with `next/font`)

## Deployment

This is a standard Next.js application that can be deployed to any platform that supports Node.js:

- **Static Export**: Run `npm run build` for static files
- **Server**: Deploy to any Node.js hosting platform
- **Environment Variables**: Set Firebase config in your deployment platform
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

## Learn More

To learn more about Next.js and the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Firebase Documentation](https://firebase.google.com/docs) - learn about Firebase Firestore
- [Tailwind CSS](https://tailwindcss.com/docs) - utility-first CSS framework

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
