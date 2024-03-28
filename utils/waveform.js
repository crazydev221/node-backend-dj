const fs = require("fs");
const wav = require("node-wav");
const id3 = require("node-id3");
const ffmpeg = require("fluent-ffmpeg");

// Read MP3 file and extract waveform
function extractWaveform(audioFilePath, outputFilePath, callback) {
  ffmpeg()
    .input(audioFilePath)
    .toFormat("wav")
    .audioCodec("pcm_s16le")
    .audioFrequency(150) // Adjust as needed
    .audioChannels(1) // Adjust as needed (1 for mono, 2 for stereo)
    .on("end", function () {
      console.log(
        `Conversion from MP3 to WAV completed. Output file: ${outputFilePath}`
      );
      const mp3Data = fs.readFileSync(outputFilePath);
      const wavData = wav.decode(mp3Data);

      // Extract waveform data
      const samples = wavData.channelData[0]; // Assuming a mono audio file
      callback(samples);
    })
    .on("error", (err) => {
      console.error("Error in converting to wav:", err.message);
      callback([]);
    })
    .save(outputFilePath);
}

module.exports = { extractWaveform };
