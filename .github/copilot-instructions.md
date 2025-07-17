<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Raid Shadow Legends Value Calculator

This is a full-stack web application for calculating and comparing energy pack values in Raid Shadow Legends.

## Project Structure
- Frontend: React + TypeScript + Vite with Tailwind CSS and Framer Motion
- Backend: Node.js + Express API with SQLite database
- Database: Stores reference pack data for intelligent grading

## Key Concepts
- Energy conversion: 1 energy pot = 130 energy units
- Value calculation: Cost per energy unit (total cost / total energy)
- Grading system: Compare against historical pack data to determine value grade
- Pack types: Raw energy, energy pots, or combinations

## Code Style
- Use TypeScript for type safety
- Implement responsive design with Tailwind CSS
- Add smooth animations with Framer Motion
- Follow React best practices with hooks and functional components
- Use proper error handling and validation
- Structure backend with clear separation of concerns
