# Recommended Main Branch Protection

Repository topology is now enforced by the release workflow: a release tag is
rejected unless its commit belongs to the fetched `main` history. Repository
administrative branch protection was not changed by the development environment.

Configure the following rules for `main` in GitHub:

- require the `CI` status check before merge;
- require branches to be up to date before merge;
- prevent force pushes;
- prevent branch deletion;
- restrict direct pushes to trusted maintainers or require pull requests.

These settings complement, rather than replace, the tag topology check in
`.github/workflows/release.yml`.
