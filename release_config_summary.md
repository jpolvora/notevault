# GitHub Release Automation for NoteVault

I have successfully configured the GitHub Actions workflow to automate the build, versioning, and release process for NoteVault.

### Changes Made

#### 1. Updated `electron-builder.yml`

Changed the publish provider from `generic` to `github` and set the repository information.

```yaml
publish:
  provider: github
  owner: jone
  repo: notevault
```

#### 2. Created `.github/workflows/release.yml`

A new workflow that triggers on a Pull Request from `develop` to `main`.
It performs the following:

- Increments the version (npm version patch).
- Builds the Windows distributable (`npm run build:win`).
- Creates a GitHub Release and uploads the installer.
- Pushes the version increment and tag back to the source branch.

### Prerequisites for GitHub repository

1. **Workflow Permissions**: Go to your repository settings under **Actions > General > Workflow permissions** and ensure "Read and write permissions" is selected. This allows the workflow to push the version tag back to the repository.
2. **Secrets**: The default `GITHUB_TOKEN` is used. For private repositories or specific setups, you might need to ensure the token has sufficient `contents: write` permissions.

### How to Trigger a Release

1. Push your changes to the `develop` (or `development`) branch.
2. Create a Pull Request from your branch to `main`.
3. The "Build/Release NoteVault" action will start, increment the version, and create the release.
