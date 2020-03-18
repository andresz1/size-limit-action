<p align="center">
  <a href="https://babeljs.io/">
    <img alt="Size Limit Action" src="/assets/logo.png" width="220">
  </a>
</p>

<p align="center">
  A GitHub action that compares the real cost of your JavaScript in every pull request
</p>
<p align="center">
  <img alt="tests status" src="https://github.com/andresz1/size-limit-action/workflows/test/badge.svg">
</p>

This action uses [Size Limit](https://github.com/ai/size-limit) (performance budget tool for JavaScript) to calculate the real cost of your JavaScript for end-users. The main features of this action are:

- **Commenting** pull requests with the comparison of Size Limit output.
- **Rejecting** a pull request if the cost exceeds the limit.

<p align="center">
  <img alt="pr comment" width="540" src="/assets/pr.png">
</p>

## Usage
1. Install Size Limit choosing the scenario that fits you better ([JS Application](https://github.com/ai/size-limit#js-applications), [Big Libraries](https://github.com/ai/size-limit#big-libraries) or [Small Libraries](https://github.com/ai/size-limit#small-libraries)).
2. Add `size-build` script in your `package.json`. This script should perform changes neccessary to run `size-limit`. For example:
```json
"scripts": {
  "size-build": "npm run build",
  "size": "npm run size-build && size-limit"
},
```
3. Define Size limit configuration. For example (inside `package.json`):
```json
"size-limit": [
  {
    "path": "dist/index.js",
    "limit": "4500 ms"
  }
]
```
4. Add the following action inside `.github/workflows/size-limit.yml`
```yaml
name: "size"
on:
  pull_request:
    branches:
      - master
jobs:
  size:
    runs-on: ubuntu-latest
    env:
      CI_JOB_NUMBER: 1
    steps:
      - uses: actions/checkout@v1
      - uses: andresz1/size-limit-action@v1.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
5. You are now all set

## Feedback

Pull requests, feature ideas and bug reports are very welcome. We highly appreciate any feedback.
