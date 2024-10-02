const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 *
 * @param {*} inputStream
 * @param {*} outStream
 * @returns
 */
const convertOggMp3 = async (inputStream, outStream) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputStream)
      .audioQuality(96)
      .toFormat("mp3")
      .save(outStream)
      .on("progress", (progress) => {
        console.log(`Progreso: ${progress.percent}%`); // Usando 'progress'
      })
      .on("end", () => {
        resolve(true);
      })
      .on("error", (err) => {
        console.error("Error en la conversión:", err); // Manejo de errores
        reject(err); // Llamar a reject en caso de error
      });
  });
};

module.exports = { convertOggMp3 };
