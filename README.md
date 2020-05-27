<p align="center">
  <img alt="Size Limit Action" src="/assets/logo.png" width="220">
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
2. By default this action will try to build your PR by running `build` [npm script](https://docs.npmjs.com/misc/scripts) located in your `package.json`. If something need to be done after dependencies are installed but before building `postinstall` npm script could be used. For example, using [lerna](https://github.com/lerna/lerna):
```json
"scripts": {
  "postinstall": "lerna bootstrap",
  "build": "lerna run build"
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
      - uses: andresz1/size-limit-action@v1.3.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
You can optionally specify a custom npm script to run instead of the default `build` adding a `build_script` option to the yml workflow shown above. Additionally, providing a `skip_step` option will tell the action to skip either the `install` or `build` phase.

```yaml
with:
  github_token: ${{ secrets.GITHUB_TOKEN }}
  build_script: custom-build
  skip_step: install
```

5. You are now all set

## Feedback

Pull requests, feature ideas and bug reports are very welcome. We highly appreciate any feedback.
