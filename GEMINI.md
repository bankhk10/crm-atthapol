# Gemini Agent Instructions

This file provides instructions and context for the Gemini agent to effectively assist with this project.

## Project Overview

*   **Description:** [Briefly describe the project, its purpose, and its main features.]
*   **Technology Stack:** [List the key technologies, frameworks, and libraries used, e.g., Next.js, React, TypeScript, Material-UI, Prisma, NextAuth.js.]
*   **Architecture:** [Briefly describe the project architecture, e.g., Monorepo, microservices, serverless, etc.]

## Getting Started

1.  **Prerequisites:**
    *   [List any software or tools that need to be installed, e.g., Node.js (specify version), pnpm, Docker.]
2.  **Installation:**
    *   Run `pnpm install` to install dependencies.
3.  **Environment Variables:**
    *   Copy `.env.example` to `.env` and fill in the required environment variables.
    *   `DATABASE_URL`: The connection string for the PostgreSQL database.
    *   `NEXTAUTH_SECRET`: A secret key for NextAuth.js.
    *   `NEXTAUTH_URL`: The base URL of the application.

## Development

*   **Running the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at [http://localhost:3000](http://localhost:3000).

*   **Seed the database:**
    ```bash
    pnpm prisma db seed
    ```

## Code Style and Conventions

*   **Linting:** Run `pnpm lint` to check for linting errors.
*   **Formatting:** This project uses Prettier for code formatting. It is recommended to set up your editor to format on save.
*   **Naming Conventions:** [Describe any specific naming conventions, e.g., for components, files, or variables.]
*   **Component Structure:** [Describe the preferred way to structure components.]

## Testing

*   **Running tests:**
    ```bash
    pnpm test
    ```
    [Describe the testing strategy, e.g., unit tests, integration tests, end-to-end tests, and the tools used, e.g., Jest, React Testing Library, Cypress.]

## Database

*   **Migrations:**
    *   To create a new migration: `pnpm prisma migrate dev --name <migration-name>`
    *   To apply migrations: `pnpm prisma migrate deploy`
*   **Prisma Studio:**
    *   `pnpm prisma studio`

## Deployment

*   [Describe the deployment process, e.g., to Vercel, AWS, etc.]

## Important Commands

*   `pnpm dev`: Starts the development server.
*   `pnpm build`: Creates a production build.
*   `pnpm start`: Starts the production server.
*   `pnpm lint`: Lints the codebase.
*   `pnpm prisma migrate dev`: Creates and applies a new database migration.
*   `pnpm prisma db seed`: Seeds the database with initial data.
