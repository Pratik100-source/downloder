const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const youtubedl = require("youtube-dl-exec");

const app = express();
const PORT = process.env.port || 5000;

app.use(cors());
app.use(bodyParser.json());

// Route to get video info and available qualities
app.post("/video-info", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const video = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    });

    const availableFormats = (video.formats || [])
      .filter((f) => f.vcodec !== "none") // only video formats
      .map((f) => ({
        format_id: f.format_id,
        resolution: f.height ? `${f.height}p` : "audio-only",
        ext: f.ext,
        url: f.url,
        filesize: f.filesize || f.filesize_approx || null,
      }));

    res.json({
      title: video.title,
      thumbnail: video.thumbnail,
      availableFormats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

// Route to download specific format
app.get("/download/:formatId", async (req, res) => {
  const { url } = req.query; // video URL
  const { formatId } = req.params; // selected format

  if (!url || !formatId) {
    return res.status(400).json({ error: "Missing URL or formatId" });
  }

  try {
    // Redirect the user to the direct URL of selected format
    const videoInfo = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    });

    const selectedFormat = videoInfo.formats.find(
      (f) => f.format_id === formatId,
    );
    if (!selectedFormat)
      return res.status(404).json({ error: "Format not found" });

    res.redirect(selectedFormat.url); // send direct download link
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch video" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
