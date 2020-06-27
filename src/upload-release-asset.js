const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');
const mime = require('mime-types');
const path = require('path');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetName = core.getInput('asset_name', { required: true });

    // optional
    const assetLabel = core.getInput('asset_label', { required: false });

    // Determine content-length for header to upload asset
    const contentLength = filePath => fs.statSync(filePath).size;
    const assetContentType = target => {
      const t = target.split('.');
      const index = t.length - 1;
      const extension = t[index];
      const type = mime.lookup(extension);
      // eslint-disable-next-line no-console
      console.log(`target: ${target}, type: ${type}`);
      return type;
    };

    // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
    const target = assetName;
    const headers = { 'content-type': assetContentType(target), 'content-length': contentLength(target) };

    // Upload a release asset
    // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
    const queryString = `?name=${assetName}&label=${assetLabel}`;

    // eslint-disable-next-line no-console
    const request = {
      url: uploadUrl.replace('?{name,label}', queryString),
      headers,
      name: assetName,
      data: fs.readFileSync(target)
    };

    const uploadAssetResponse = await github.repos.uploadReleaseAsset(request);

    // Get the browser_download_url for the uploaded release asset from the response
    const {
      data: { browser_download_url: browserDownloadUrl }
    } = uploadAssetResponse;

    // Set the output variable for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    core.setOutput('browser_download_url', browserDownloadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
