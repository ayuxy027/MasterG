# React-Vite-Template

A modern, production-ready React template built with Vite, TypeScript, and Tailwind CSS. This template provides a solid foundation for building scalable React applications with best practices built-in.

## Features

- ⚛️ **React 19** - Latest React features and improvements
- ⚡ **Vite** - Blazing fast build tool and development server
- 🚀 **TypeScript** - Type safety for better code quality and developer experience
- ✨ **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- 🔧 **ESLint & Prettier** - Code linting and formatting for consistent code style
- 🛠️ **Modern JavaScript/TypeScript** - ES2020+ features enabled
- 📦 **Tree-shaking** - Optimized bundle size with automatic dead code elimination
- 🌐 **HMR** - Hot Module Replacement for instant feedback during development

## Quick Start

### Prerequisites

- Node.js 18+ recommended
- npm or yarn package manager

### Installation

1. Clone the repository or create a new project with this template
2. Install dependencies:

```bash
npm install
```

### Development

To run the development server:

```bash
npm run dev
```

This will start the development server at `http://localhost:5173` (or another available port).

### Build

To create a production build:

```bash
npm run build
```

This will create an optimized build in the `dist/` directory.

### Linting & Type Checking

To lint your code:

```bash
npm run lint
```

To check TypeScript types:

```bash
npm run typecheck
```

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/          # Page-level components
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── styles/         # Global styles and CSS modules
├── assets/         # Static assets (images, fonts, etc.)
├── App.tsx         # Main application component
├── main.tsx        # Application entry point
└── index.css       # Global styles
```

## Recommended Practices

### Component Development
- Use TypeScript for all components to ensure type safety
- Keep components small and focused on a single responsibility
- Use functional components with hooks instead of class components
- Follow naming conventions: `PascalCase` for components, `camelCase` for utilities

### Styling
- Leverage Tailwind CSS utility classes for styling
- Use responsive prefixes for mobile-first design
- Create reusable components with consistent design patterns
- Use Tailwind's dark mode support when needed

### State Management
- Use React's built-in hooks (`useState`, `useEffect`, `useContext`) for simple state
- Consider external state management libraries for complex applications
- Follow the lifting state up principle when needed

## Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Create production build
- `npm run lint` - Run ESLint to check for code issues
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Clean installation (removes node_modules, package-lock.json, dist)

## Dependencies

- `react`, `react-dom` - Core React libraries
- `typescript` - Static type checking
- `vite` - Build tool and development server
- `tailwindcss` - CSS framework
- `@vitejs/plugin-react-swc` - React plugin for Vite
- `eslint` - Code linting

## Contributing

This template is designed to be used as-is, but improvements are welcome via pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.