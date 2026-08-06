# Agent Instructions

## Deployment

- Production deployment must use the repository deployment script:
  `./scripts/deploy_web.sh deploy`
- The npm alias is also acceptable because it calls the same script:
  `npm run deploy`
- Status checks should use:
  `./scripts/deploy_web.sh status`
- If the deployment script fails because of environment, dependency, compatibility, test, build, upload, nginx, or public URL check issues, fix or make the script compatible first, then rerun the script.
- Do not bypass the script with ad hoc production steps such as manually building and copying `dist`, manually uploading archives, editing remote files, or reloading nginx directly.
