const fs = require("fs");
const xml2js = require("xml2js");
const { writeFromParsedData } = require("./exportDAT.js");
const { writePDBFromParsedData } = require("./exportPDB.js");

function exportFromXML(xmlFilePath, usb_drive) {
  fs.readFile(xmlFilePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading XML file:", err);
      return;
    }

    // Parse XML to Object
    try {
      xml2js.parseString(data, (parseErr, result) => {
        if (parseErr) {
          console.error("Error parsing XML:", parseErr);
          return;
        }
        console.log("--- Parsing XML successfully ---");
        // Now, 'result' contains the parsed XML as a Object
        const path_data = writePDBFromParsedData(result, usb_drive);
        writeFromParsedData(result, path_data, usb_drive);
      });
    } catch (e) {
      console.log("Error in parsing XML:", e);
    }
  });
}

module.exports = { exportFromXML };
