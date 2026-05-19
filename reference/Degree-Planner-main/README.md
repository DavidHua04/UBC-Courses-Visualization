# UBC Degree Planner

<p align="center">
  <i>Plan smarter. Track progress. Graduate on time.</i>
</p>

## Overview

UBC Degree Planner is a centralized academic planning tool designed to simplify how students manage their degree requirements.

Instead of manually cross-checking Workday, program pages, and PDFs, students can build structured term schedules, monitor their progress, and understand exactly what remains before graduation.

## Features

### Degree Tracking
- Automatically tracks completed, in-progress, and remaining requirements  
- Real-time updates as courses are added or modified  
- Supports core, elective, and specialization requirements  

### Term Planning
- Build schedules across multiple academic terms  
- Organize courses while respecting prerequisites and sequencing  
- Prevents invalid course combinations  

### Progress Visualization
- Clear overview of credits completed vs remaining  
- Structured breakdown of degree requirements  
- Helps ensure on-time graduation  

### Intelligent Recommendations
- Suggests courses based on remaining requirements  
- Helps balance workload across semesters  
- Reduces planning errors and missed requirements  

## User Experience

The interface is designed to make complex academic planning simple and intuitive.

- Clean, structured layouts  
- Minimal navigation for faster workflows  
- Focus on clarity over complexity  
- Immediate feedback on changes  

## Tech Stack

| Layer        | Technology |
|--------------|-----------|
| Frontend     | React |
| Language     | TypeScript |
| Styling      | Tailwind CSS |
| Build Tool   | Vite |

## Architecture

- Component-based UI design  
- Modular state management  
- Structured data models for degree requirements  
- Validation system for prerequisites and credit rules  

## Project Structure
```
ubc-degree-planner/
├── src/                  # Source code
│   ├── App/              # Application entry point
│   ├── Models/           # Data models (Course, DegreeProgram, TermPlan)
│   ├── ViewModels/       # Business logic (Planner, ProgressTracker)
│   ├── Views/            # UI components and pages
│   │   ├── Pages/        # Main screens
│   │   ├── Modals/       # Modal components
│   │   └── Components/   # Reusable UI components
│   ├── Services/         # Core logic (validation, recommendations)
│   ├── Hooks/            # Custom React hooks
│   ├── Utilities/        # Helper functions
│   └── Styles/           # Global styles (Tailwind config)
│
├── public/               # Static assets
├── package.json          # Project dependencies
└── vite.config.ts        # Vite configuration
```
## Installation

git clone https://github.com/dzoulk/Degree-Planner.git
cd ubc-degree-planner
npm install
npm run dev
