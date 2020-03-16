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

- Commenting pull requests with the comparassion of the output of Size Limit.
- Rejecting a pull request if the cost exceeds the limit.

<p align="center">
  <img alt="pr comment" width="540" src="/assets/pr.png">
</p>

## Usage
1. Install Size Limit choosing the scenario that fits you better ([JS Application](https://github.com/ai/size-limit#js-applications), [Big Libraries](https://github.com/ai/size-limit#big-libraries) or [Small Libraries](https://github.com/ai/size-limit#small-libraries)).
2. Add `size-build` script in you `package.json`. This script should perform changes neccessary to perform a `size-limit`. For example:
```json
"scripts": {
  "size": "npm run build"
},
```
3. Add this action inside `.github/workflows`
```
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
      - uses: andresz1/size-limit-action@v0.1.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
4. You are now all set

## Feedback

Pull requests, feature ideas and bug reports are very welcome. We highly appreciate any feedback.
