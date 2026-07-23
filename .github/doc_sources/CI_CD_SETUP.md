# Vigilon CI/CD Pipeline Configuration
# Version 1.0 - Cross-Platform Build & Testing Automation

## Overview
This directory contains GitHub Actions workflows for building, testing, and deploying the Vigilon platform across multiple platforms (Windows, Linux).

## Key Features

### 1. Cross-Platform Builder Workflows
- **Agent Builder** (`.github/workflows/agent-builder.yml`): Builds Go binaries for Windows and Linux
- **Backend Builder** (`.github/workflows/backend-builder.yml`): Builds Node.js applications
- **Frontend Builder** (`.github/workflows/frontend-builder.yml`): Builds Next.js applications

### 2. Comprehensive Testing
- **Unit Tests**: Go and Node.js unit tests
- **Integration Tests**: E2E testing with Playwright/Cypress
- **Security Scans**: CodeQL, GoSec, Bandit security scanning
- **Artifact Validation**: Binary integrity and functionality checks

### 3. Automated Signings
- **Windows Code Signing**: Open-source code signing for Windows binaries
- **Version Management**: Semantic versioning and changelog
- **Artifact Upload**: Organized artifact storage and distribution

### 4. Deployment Automation
- **Staging Environment**: Automated deployment to staging servers
- **Production Deployment**: Blue-green deployment strategy
- **Rollback Capability**: Automated rollback on failure

---

## Directory Structure

.github/workflows/
├── agent-builder.yml          # Go agent compilation and signing
├── backend-builder.yml        # Node.js/backend build and test
├── frontend-builder.yml       # Next.js frontend build and test
├   └─ scripts/              # Build helper scripts
├── security-scan.yml         # Security scanning pipeline
├── e2e-test.yml              # End-to-end testing
└── release.yml              # Release and publication

## Configuration Templates

### GitHub Secrets Required
```yaml
# Secrets for GitHub Actions
secrets:
  WINDOWS_CODE_SIGN_CERT:
    description: "Base64 encoded Windows code signing certificate"
    required: true
  WINDOWS_CODE_SIGN_PASSWORD:
    description: "Password for Windows code signing certificate"
    required: true
  AWS_ACCESS_KEY_ID:
    description: "AWS access key for S3 artifact storage"
    required: false
  AWS_SECRET_ACCESS_KEY:
    description: "AWS secret key for S3 artifact storage"
    required: false
  NPM_TOKEN:
    description: "NPM authentication token for private packages"
    required: false
  GH_TOKEN:
    description: "GitHub token for API access"
    required: true
```

### Environment Variables
```yaml
env:
  NODE_ENV: production
  GO111MODULE: on
  CGO_ENABLED: 0
  LDFLAGS: -extldflags "-static"
```

---

## Build Process Overview

### Agent Build (`agent-builder.yml`)
1. **Checkout Code**: Pull repository with full history
2. **Setup Go Environment**: Configure Go workspace and modules
3. **Generate Code**: Run code generation tools
4. **Build Binaries**:
   - Linux static binary (musl or glibc based on environment)
   - Windows executable (with potential static linking)
5. **Code Signing** (Windows only): Sign binaries with open-source certificate
6. **Testing**: Run unit tests and integration tests
7. **Artifact Packaging**: Create deployment packages

### Backend Build (`backend-builder.yml`)
1. **Checkout Code**: Pull repository
2. **Setup Node.js**: Install Node.js and dependencies
3. **Install Dependencies**: `npm ci` or `yarn install --frozen-lockfile`
4. **Type Checking**: Run TypeScript compilation
5. **Linting**: ESLint and Prettier validation
6. **Unit Tests**: Jest or other testing framework
7. **Build Application**: `npm run build`
8. **Security Scanning**: npm audit, OWASP dependency check

### Frontend Build (`frontend-builder.yml`)
1. **Checkout Code**: Pull repository
2. **Setup Node.js**: Install Node.js and dependencies
3. **Install Dependencies**: `npm ci` or `yarn install --frozen-lockfile`
4. **Type Checking**: TypeScript compilation validation
5. **Linting**: ESLint and Prettier validation
6. **Unit Tests**: Jest testing with coverage
7. **Build Application**: `npm run build`
8. **Static Analysis**: Build introspection and bundle analysis

---

## Security and Compliance

### Code Security
- **Dependency Scanning**: npm audit, `go mod tidy`, and vulnerability checks
- **Static Analysis**: CodeQL, GoSec, and language-specific linters
- **Secret Detection**: Detect and prevent secret leakage in CI/CD
- **License Validation**: Ensure open-source license compliance

### Build Security
- **Container Security**: Multi-stage Docker builds
- **Artifact Verification**: Checksum validation for downloads
- **Binary Analysis**: Static binary analysis tools
- **Signed Artifacts**: Ensure all distributed binaries are properly signed

### Environment Security
- **Secret Management**: GitHub Actions secrets management
- **Access Control**: Repository and environment permissions
- **Audit Logging**: Comprehensive logging of all CI/CD actions

---

## Testing Strategy

### Unit Testing
```yaml
# Example from agent-builder.yml
- name: Run Go Unit Tests
  run: |
    go test ./... -v -coverprofile=coverage.out
    go tool cover -html=coverage.out -o coverage.html
```

### Integration Testing
```yaml
# Example from e2e-test.yml
- name: Setup E2E Test Environment
  run: |
    # Start local services
    docker-compose up -d
    # Wait for services to be ready
    sleep 30
```

### Security Testing
```yaml
# Example from security-scan.yml
- name: Security Scan
  run: |
    # Go security scan
    go install golang.org/x/tools/go/analysis/passes/...@latest
    gopls version
    # Run security analysis
    go security-scan ./...
    
    # Node.js security scan
    npm audit --audit-level moderate
```

---

## Deployment Automation

### Staged Rollout Strategy
1. **Staging Environment**: Automated deployment to staging servers
2. **Health Checks**: Verify deployment health and functionality
3. **Canary Testing**: Gradual rollout to a subset of servers
4. **Production Rollout**: Full deployment after successful validation
5. **Rollback**: Automated rollback on failure

### Deployment Scripts (`.github/workflows/release.yml`)
```yaml
on:
  release:
    types: [published]

jobs:
  deploy-to-staging:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          ssh user@staging-server "cd /opt/vigilon && git pull"
          ssh user@staging-server "docker-compose up -d"
          ssh user@staging-server "curl http://localhost:8080/health"

  deploy-to-production:
    runs-on: ubuntu-latest
    needs: deploy-to-staging
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          ssh user@production-server "cd /opt/vigilon && git pull"
          ssh user@production-server "docker-compose down && docker-compose up -d"
```

---

## Monitoring and Logging

### Build Status Tracking
- **GitHub Actions Status**: Real-time build status monitoring
- **Coverage Reports**: Test coverage tracking and analysis
- **Security Dashboards**: Security vulnerability trends and remediation
- **Performance Metrics**: Build time, resource usage monitoring

### Artifact Management
- **S3 Storage**: Artifact storage and versioning
- **CloudFront CDN**: Fast content delivery
- **Cleanup Policies**: Automated artifact cleanup
- **Access Controls**: Secure artifact access management

---

## Best Practices

### Security
- Never commit secrets to repository
- Use GitHub Actions secrets for sensitive data
- Implement least privilege access controls
- Regular security audit of CI/CD configurations

### Reliability
- Use matrix builds for parallel testing
- Implement comprehensive error handling
- Use caching for build dependencies
- Monitor build success rates and failures

### Performance
- Use build caching to reduce CI/CD times
- Implement parallel builds where possible
- Use efficient test strategies
- Monitor resource usage and optimize

---

## Migration Guide

### From Previous CI/CD
1. **Migrate Configuration**: Move `.github/workflows/*` from previous CI provider
2. **Update Secrets**: Migrate secrets from previous CI platform
3. **Adjust Scripts**: Update build and deployment scripts for GitHub Actions
4. **Test Integration**: Verify all integrations work with GitHub Actions

---

This CI/CD system provides a comprehensive, secure, and scalable solution for the Vigilon platform, supporting cross-platform builds, comprehensive testing, and automated deployment with enterprise-grade security and reliability.
