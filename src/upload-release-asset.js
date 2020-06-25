const core = require('@actions/core');
const { GitHub } = require('@actions/github');
const fs = require('fs');
const mime = require('mime-types')

async function run() {
  try {
    //  [0]node [1]src/main.js [2]--debug [3]url [4]name
    const debug = process.argv.indexOf('--debug') > -1 ? true : false
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const uploadUrl = debug ? process.argv[3] : core.getInput('upload_url', { required: true });
    const assetName = debug ? process.argv[4] : core.getInput('asset_name', { required: true });
    // const assetContentType = debug ? core.getInput('asset_content_type', { required: true }) : ;

    // optional
    const assetPath = core.getInput('asset_path', { required: false });
    const assetLabel = core.getInput('asset_label', { required: false });

    // Determine content-length for header to upload asset
    const contentLength = filePath => fs.statSync(filePath).size;
    const assetContentType = target => {
      if (target.indexOf('.')) {
        const f = target.split('.')
        return mime.lookup(f[f.length - 1])
      }
      return 'text/plain'
    }

    // Setup headers for API call, see Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-repos-upload-release-asset for more information
    const target = assetPath !== '' ? assetPath : assetName;
    const headers = { 'content-type': assetContentType(target), 'content-length': contentLength(target) };

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
    const request = {
      url: uploadUrl.replace('?{name,label}', queryString),
      headers,
      name: assetName,
      data: fs.readFileSync(target)
    };
    if (debug) {
      console.log(`request : ${JSON.stringify(request)}`);
    }

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
