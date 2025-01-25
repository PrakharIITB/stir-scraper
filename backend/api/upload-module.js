const express = require('express');

const router = express.Router();


router.post('/upload', async (req, res) => {
  try {
    const accessKey = "af0e57f3-79b6-49c9-b3d96dd2ad18-2946-4282"

    const { url, file_name, storage_path } = req.body;

    if (!url || !file_name || !storage_path) {
      return res.status(400).json({ error: 'Missing required fields: url, file_name, or storage_path' });
    }

    console.log(`Uploading URL: ${url}, file_name: ${file_name}, storage_path: ${storage_path}`);

    // Fetch the source file
    const sourceResponse = await fetch(url);
    if (!sourceResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch the source file' });
    }

    // Upload the file to BunnyCDN
    const uploadUrl = `https://ny.storage.bunnycdn.com/createstir-ny${storage_path}/${file_name}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': accessKey,
        'Content-Type': 'application/octet-stream',
      },
      body: sourceResponse.body, // Stream directly to BunnyCDN
      duplex: 'half', // Required for streaming the body in Node.js
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    res.json({
      success: true,
      img_url_https: `https://createstir.b-cdn.net${storage_path}/${file_name}`,
      image_url: `createstir.b-cdn.net${storage_path}/${file_name}`,
    });
  } catch (error) {
    console.error('Error uploading to BunnyCDN:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
})

module.exports = router;