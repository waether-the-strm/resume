# Personal CV Website

This is my personal CV website built with Astro, React, and TailwindCSS. The website serves as an interactive and modern representation of my professional experience and skills.

## 🛠️ Tech Stack

- [Astro](https://astro.build) - Static Site Generator
- [React](https://reactjs.org) - UI Components
- [TailwindCSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org) - Type Safety
- [HeadlessUI](https://headlessui.com) - Accessible UI Components

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd cv-repo
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:4321`

## 📝 Available Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Starts the development server        |
| `npm run build`   | Builds the site for production       |
| `npm run preview` | Preview the production build locally |

## 🚀 Deployment

This website is automatically deployed to GitHub Pages whenever changes are pushed to the `main` branch. The deployment process is handled by GitHub Actions and includes the following steps:

1. Automatic build and deployment on push to `main`
2. Manual deployment option available through GitHub Actions
3. Deployment status and history can be viewed in the Actions tab

The deployment workflow:

- Uses Node.js 20
- Builds the site using Astro
- Deploys to GitHub Pages
- Provides automatic HTTPS
- Updates the site within minutes of pushing changes

## 🏗️ Project Structure

```
/
├── public/          # Static assets
├── src/
│   ├── components/  # React components
│   ├── layouts/     # Page layouts
│   ├── pages/       # Astro pages
│   └── styles/      # Global styles
└── package.json     # Project dependencies and scripts
```

## 🎨 Customization

To customize this CV website:

1. Update personal information in the relevant components
2. Modify the styling using TailwindCSS classes
3. Add or remove sections as needed
4. Update the content in the MDX files

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contact

For any questions or suggestions, please feel free to reach out through (jan@strm.dev)[mailto:jan@strm.dev].
