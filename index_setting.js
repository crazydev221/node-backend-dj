const { readMySettingFile } = require("./mysettings/File");

const filePath = "./testfiles/export/PIONEER/MYSETTING.DAT";
const mySettingData = readMySettingFile(filePath);

if (mySettingData) {
  const sync = mySettingData.get("sync");
  const quant = mySettingData.get("quantize");

  console.log("Sync:", sync);
  console.log("Quant:", quant);
}
