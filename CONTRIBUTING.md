# Contributing to SecuriMon

First off, thank you for considering contributing to SecuriMon! It's people like you that make SecuriMon such a great tool for securing and managing servers.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](../../issues) to see if it's already being discussed. If it's not, go ahead and open a new issue!

## Development Setup

SecuriMon is a multi-component platform consisting of:
- **Agent:** Go (Golang)
- **Backend:** Node.js (Prisma, Express/NestJS)
- **Frontend:** Next.js, Tailwind CSS

### Prerequisites
- Node.js (v18+)
- Go (v1.21+)
- PostgreSQL (or SQLite for local dev)

### Fork & Clone
1. Fork the repo to your own GitHub account.
2. Clone it to your local machine: `git clone https://github.com/YOUR-USERNAME/securimon.git`
3. Refer to the specific sub-folder `README.md` files (in `/backend`, `/frontend`, and `/agent`) for instructions on how to run them locally.

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3. You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please be respectful to all contributors.
