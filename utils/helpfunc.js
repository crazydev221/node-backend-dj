const fs = require("fs");
const path = require("path");

function byteArrayToStringWithTrim(bytes) {
  // Convert byte array to a string
  let str = String.fromCharCode.apply(null, bytes);

  // Remove trailing zeros
  str = str.replace(/\0+$/, "");

  return str;
}

function byteArrayToStringWithoutTail(byteArray) {
  const indexOf00 = byteArray.indexOf(0x00);
  const resultArray =
    indexOf00 !== -1 ? byteArray.slice(0, indexOf00) : byteArray;

  return resultArray.toString();
}

function getTodayDate() {
  var today = new Date();

  // Get the components of the date
  var year = today.getFullYear();
  var month = (today.getMonth() + 1).toString().padStart(2, "0"); // Zero-padding month
  var day = today.getDate().toString().padStart(2, "0"); // Zero-padding day

  // Format the date as "yyyy-mm-dd"
  var formattedDate = year + "-" + month + "-" + day;
  return formattedDate;
}

function intToHex(number, padding) {
  // Convert the number to a hex string
  var hexString = number.toString(16).toUpperCase();

  // Pad the string with zeros to the desired length
  while (hexString.length < padding) {
    hexString = "0" + hexString;
  }

  return hexString;
}

function copyFile(sourcePath, destinationPath) {
  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destinationPath);

  ensureDirectoryExistence(destinationPath);
  readStream.pipe(writeStream);

  writeStream.on("finish", () => {
    console.log(sourcePath, "copied successfully!");
  });

  writeStream.on("error", (err) => {
    console.error("Error copying file:", err);
  });
}

function deleteFile(path) {
  // Use the unlink function to delete the file
  fs.unlink(path, (err) => {
    if (err) {
      console.error(`Error deleting file: ${err.message}`);
    } else {
      console.log(`${path} has been deleted`);
    }
  });
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);

  if (fs.existsSync(dirname)) {
    return true;
  }

  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function getValidString(data) {
  return data === undefined || data === null ? "" : data;
}

function getValidNumber(data) {
  return data === undefined || data === null ? 0 : Number(data);
}

function deleteZeroTail(stringdata) {
  const index = stringdata.indexOf("\x00");
  if (index === -1) {
    return stringdata;
  }
  return stringdata.slice(0, index);
}

function getStringFromPDB(data, offset, mode = "utf-8") {
  const len = (data.readUInt8(offset) - 3) / 2;
  return data.toString(mode, offset + 1, offset + len + 1);
}

function isUTF16String(str) {
  const strArray = new TextEncoder().encode(str);
  return strArray.length !== str.length;
}

function makeValidFilePath(filePath) {
  // Define a regular expression to match the characters you want to replace
  const regex = /[<>:"\/\\|?*]/g;

  // Replace the matched characters with underscores
  const newFilePath = filePath.replace(regex, "_");

  return newFilePath;
}

module.exports = {
  byteArrayToStringWithTrim,
  byteArrayToStringWithoutTail,
  getTodayDate,
  intToHex,
  copyFile,
  deleteFile,
  ensureDirectoryExistence,
  getValidNumber,
  getValidString,
  deleteZeroTail,
  getStringFromPDB,
  isUTF16String,
  makeValidFilePath,
};
