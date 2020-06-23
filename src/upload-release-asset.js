const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = core.getInput('upload_url', { required: true });
    const assetName = core.getInput('asset_name', { required: true });
    const assetContentType = core.getInput('asset_content_type', { required: true });

    // optional
    const assetPath = core.getInput('asset_path', { required: false });
    const assetLabel = core.getInput('asset_label', { required: false });

    // Determine content-length for header to upload asset
    const contentLength = filePath => fs.statSync(filePath).size;

    // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
    const target = assetPath !== '' ? assetPath : assetName;
    const headers = { 'content-type': assetContentType, 'content-length': contentLength(target) };

    // Upload a release asset
    // API Documentation: https://developer.github.com/v3/repos/releases/#upload-a-release-asset
    // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset
    let queryString = '?';
    if (assetName !== '') {
      queryString += `name=${assetName}`;
    }
    if (assetLabel !== '') {
      queryString += queryString.length > 1 ? `&label=${assetLabel}` : `label=${assetLabel}`;
    }

    // eslint-disable-next-line no-console
    console.log(`request : ${JSON.stringify({
        url: uploadUrl.replace('{?name,label}', queryString),
        headers,
        name: assetName,
        file: fs.readFileSync(assetPath !== '' ? assetPath : assetName)
      })}`
    );

    const uploadAssetResponse = await github.repos.uploadReleaseAsset({
      url: uploadUrl.replace('{?name,label}', queryString),
      headers,
      name: assetName,
      file: fs.readFileSync(assetPath !== '' ? assetPath : assetName)
    });

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
