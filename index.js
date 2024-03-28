const { AnlzFile } = require("./anlz/File");
// const { readMySettingFile } = require("./mysettings/File");
const { exportFromXML } = require("./xml/readxml");

// ---------- Analyze the tag data ----------
// const analyzer = AnlzFile.parseFile(
//   "F:/PIONEER/USBANLZ/P018/000286A0/ANLZ0000.DAT"
// );

// path_tags = analyzer.getAllTags("path");
// console.log("Path Tags:");
// console.log(JSON.stringify(path_tags, null, 2));

// ---------- Analyze the setting data ----------
// const filePath = "./testfiles/export/PIONEER/MYSETTING.DAT";
// const mySettingData = readMySettingFile(filePath);

// if (mySettingData) {
//   const sync = mySettingData.get("sync");
//   const quant = mySettingData.get("quantize");

//   console.log("Sync:", sync);
//   console.log("Quant:", quant);
// }

// ---------- Export the tag data from xml ----------
const xmlFilePath = "./testfiles/xml/rekordbox_test.xml";
const usbDrive = "F:"; // in windows, "USBDriveName:" in mac, "/Volumes/USBDriveName"
exportFromXML(xmlFilePath, usbDrive);
