const fs = require("fs");
const NodeID3 = require("node-id3");
const { ensureDirectoryExistence } = require("./helpfunc");
const sharp = require("sharp");

function extractArtwork(filePath, outputPath) {
  try {
    // Ensure the output directory exists
    ensureDirectoryExistence(outputPath);

    // Read the file synchronously
    const buffer = fs.readFileSync(filePath);

    // Extracting ID3 tags
    const tags = NodeID3.read(buffer);

    // Accessing the first picture (artwork) in the tags
    const artwork = tags.image && tags.image.imageBuffer;

    if (artwork) {
      // Saving the artwork to a file
      // fs.writeFileSync(outputPath, artwork);
      // console.log("Artwork was saved in", outputPath);
      sharp(artwork)
        .resize(240, 240)
        .toFile(outputPath, (err, info) => {
          if (err) {
            console.error("Error resizing and saving image:", err.message);
          } else {
            console.log("Image is saved:", outputPath);
          }
        });
      const ext_i = outputPath.lastIndexOf(".");
      const before_ext = outputPath.slice(0, ext_i) + "_m.jpg";
      console.log(before_ext);

      sharp(artwork)
        .resize(80, 80)
        .toFile(before_ext, (err, info) => {
          if (err) {
            console.error("Error resizing and saving image:", err.message);
          } else {
            console.log("Image is resized:", before_ext);
          }
        });
      return true;
    } else {
      // console.log("No artwork found in the file.");
      return false;
    }
  } catch (error) {
    console.error("Error extracting artwork:", error.message);
    return false;
  }
}

module.exports = { extractArtwork };
