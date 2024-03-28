const fs = require("fs");
const os = require("os");
const {
  getPDBHeader,
  getTablePoint,
  getPageInfo,
  getRowInfo,
} = require("./readpdb");
const { ensureDirectoryExistence, deleteFile } = require("../utils/helpfunc");
const { extractWaveform } = require("../utils/waveform");

const platform = os.platform();

// Read MP3 file and extract waveform

function getFileHeader(len_file) {
  // Assumption values
  const u1 = 1;
  const u2 = 65536;
  const u3 = 65536;
  const u4 = 0;

  const headerData = Buffer.alloc(28);
  const len_header = 28;
  headerData.write("PMAI");
  headerData.writeUInt32BE(len_header, 4);
  headerData.writeUInt32BE(len_file, 8);
  headerData.writeUInt32BE(u1, 12);
  headerData.writeUInt32BE(u2, 16);
  headerData.writeUInt32BE(u3, 20);
  headerData.writeUInt32BE(u4, 24);

  return headerData;
}

// ----- for both of DAT and EXT -----
// PPTH, path
function addPathTagData(path, currentData) {
  // constant values
  const path_head_len = 16;
  const path_len = path.length * 2;
  const path_tag_len = path_head_len + path_len;

  const pathData = Buffer.alloc(path_tag_len);
  pathData.write("PPTH");
  pathData.writeUInt32BE(path_head_len, 4);
  pathData.writeUInt32BE(path_tag_len, 8);
  pathData.writeUInt32BE(path_len, 12);

  // write the path string as utf-16 big endian
  for (let i = 0; i < path.length; i++) {
    const charCode = path.charCodeAt(i);
    pathData.writeUInt16BE(charCode, 16 + i * 2);
  }

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + path_tag_len, 8);

  return Buffer.concat([currentData, pathData]);
}
// PCOB, cue_list
function addCueTagData(track_cue_data, currentData, isDAT, type) {
  const track_cues =
    track_cue_data === undefined || track_cue_data === null
      ? []
      : track_cue_data;
  // constant values
  const cue_head_len = 24;
  const cue_entry_len = 56;
  const cue_entry_header = 28;

  const filtered_cues = [];
  const filtered_nums = [];

  // ----- filter the cue point tags -----
  for (var j = 0; j < track_cues.length; j++) {
    const current_cue = Number(track_cues[j].$.Num);

    if (
      filtered_nums.indexOf(current_cue) === -1 &&
      ((isDAT && current_cue >= 0 && current_cue <= 2) ||
        (!isDAT && current_cue >= 3 && current_cue <= 7))
    ) {
      // filtering cue point
      filtered_nums.push(current_cue);
      filtered_cues.push(track_cues[j]);
    }
  }

  const cue_count = filtered_cues.length; // count of POSITION_MARK tag in XML
  const cue_tag_len = cue_head_len + cue_count * cue_entry_len;

  // Assumption values
  const memory_count = -1;
  const status = 0;
  const u1 = 65536;
  const order_first = 65535;
  const order_last = 65535;
  const t = 1;
  const u2 = 1000;
  const loop_time = 4294967295;

  const cueTagData = Buffer.alloc(cue_tag_len);
  cueTagData.write("PCOB");
  cueTagData.writeUInt32BE(cue_head_len, 4);
  cueTagData.writeUInt32BE(cue_tag_len, 8);
  cueTagData.writeUInt32BE(type, 12); // if 0: memory, else 1: hotcue
  cueTagData.writeUInt16BE(cue_count, 18);
  cueTagData.writeInt32BE(memory_count, 20);

  var offset = 24; // same as len_header
  for (var k = 0; k < cue_count; k++) {
    const hot_cue = Number(filtered_cues[k].$.Num) + 1;
    const time = Number(filtered_cues[k].$.Start) * 1000;

    cueTagData.write("PCPT", offset);
    cueTagData.writeUInt32BE(cue_entry_header, offset + 4);
    cueTagData.writeUInt32BE(cue_entry_len, offset + 8);
    cueTagData.writeUInt32BE(hot_cue, offset + 12);
    cueTagData.writeUInt32BE(status, offset + 16);
    cueTagData.writeUInt32BE(u1, offset + 20);
    cueTagData.writeUInt16BE(order_first, offset + 24);
    cueTagData.writeUInt16BE(order_last, offset + 26);
    cueTagData.writeUInt8(t, offset + 28);
    cueTagData.writeUInt16BE(u2, offset + 30);
    cueTagData.writeUInt32BE(time, offset + 32);
    cueTagData.writeUInt32BE(loop_time, offset + 36);

    offset += cue_entry_len;
  }
  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + cue_tag_len, 8);
  return Buffer.concat([currentData, cueTagData]);
}

// ----- only for DAT -----
// PQTZ, beat_list
function addBeatTagData(track_beats, total_time, currentData) {
  // constant values
  const beat_head_len = 24;
  const beat_entry_len = 8;
  const beat_per_min = track_beats[0].$.Bpm;
  const beat_per_sec = beat_per_min / 60;
  const beat_gap = 1 / beat_per_sec;

  const u2 = 524288;

  var beat_count = total_time / beat_gap; // track_beats.length; // count of TEMPO tag in XML
  beat_count =
    beat_count % 1 > 0.5 ? Math.ceil(beat_count) : Math.floor(beat_count);
  const beat_tag_len = beat_head_len + beat_entry_len * beat_count; // size of beat tag

  const beatData = Buffer.alloc(beat_tag_len);
  beatData.write("PQTZ");
  beatData.writeUInt32BE(beat_head_len, 4);
  beatData.writeUInt32BE(beat_tag_len, 8);
  beatData.writeUInt32BE(u2, 16);
  beatData.writeUInt32BE(beat_count, 20);

  var init_time = Number(track_beats[0].$.Inizio)
    ? Number(track_beats[0].$.Inizio)
    : 0;
  var init_beat = Number(track_beats[0].$.Battito)
    ? Number(track_beats[0].$.Battito)
    : 1;

  for (let l = 0; l < beat_count; l++) {
    const beat = ((init_beat + l - 1) % 4) + 1;
    var time = (init_time + beat_gap * l) * 1000;
    time = time % 1 > 0.5 ? Math.ceil(time) : Math.floor(time);
    beatData.writeUInt16BE(beat, 24 + l * 8);
    beatData.writeUInt16BE(beat_per_min * 100, 26 + l * 8);
    beatData.writeUInt32BE(time, 28 + l * 8);
  }
  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + beat_tag_len, 8);
  return Buffer.concat([currentData, beatData]);
}
// PVBR, vbr
function addVBRTagData(currentData) {
  // constant values
  const vbr_head_len = 16;
  const vbr_tag_len = 1620;
  const u1 = 0;

  // Assumption values
  const u2 = 8343936;

  const vbrData = Buffer.alloc(vbr_tag_len);
  vbrData.write("PVBR");
  vbrData.writeUInt32BE(vbr_head_len, 4);
  vbrData.writeUInt32BE(vbr_tag_len, 8);
  vbrData.writeUInt32BE(u1, 12);

  vbrData.writeUInt32BE(u2, 1604);

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + vbr_tag_len, 8);

  return Buffer.concat([currentData, vbrData]);
}
// PWAV
function addWaveformPreview(wf_data, currentData) {
  // constant values
  const wf_preview_head_len = 20;
  const wf_preview_len = 400;
  const wf_preview_tag_len = wf_preview_head_len + wf_preview_len;

  // Assumption values
  const u1 = 65536;

  const wf_preview = Buffer.alloc(wf_preview_tag_len);
  wf_preview.write("PWAV");
  wf_preview.writeUInt32BE(wf_preview_head_len, 4);
  wf_preview.writeUInt32BE(wf_preview_tag_len, 8);
  wf_preview.writeUInt32BE(wf_preview_len, 12);
  wf_preview.writeUInt32BE(u1, 16);

  const offset = 20;
  for (let i = 0; i < wf_preview_len; i++) {
    var index = (wf_data.length / wf_preview_len) * i;
    index = index % 1 > 0.5 ? Math.ceil(index) : Math.floor(index);
    var y = wf_data[index];
    y = (0.5 + 0.5 * y) * 32;
    y = y % 1 > 0.5 ? Math.ceil(y) : Math.floor(y);
    y = y & 0x1f;
    const whiteness = 5; // assumption value
    const wf_entry = whiteness * 32 + y;
    wf_preview.writeUInt8(wf_entry, i + offset);
  }
  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + wf_preview_tag_len, 8);
  return Buffer.concat([currentData, wf_preview]);
}
// PWV2
function addWaveformTinyPreview(twf_data, currentData) {
  // constant values
  const twf_preview_head_len = 20;
  const twf_preview_len = 100;
  const twf_preview_tag_len = twf_preview_head_len + twf_preview_len;

  // Assumption values
  const u1 = 65536;

  const twf_preview = Buffer.alloc(twf_preview_tag_len);
  twf_preview.write("PWV2");
  twf_preview.writeUInt32BE(twf_preview_head_len, 4);
  twf_preview.writeUInt32BE(twf_preview_tag_len, 8);
  twf_preview.writeUInt32BE(twf_preview_len, 12);
  twf_preview.writeUInt32BE(u1, 16);

  const offset = 20;
  for (let i = 0; i < twf_preview_len; i++) {
    var index = (twf_data.length / twf_preview_len) * i;
    index = index % 1 > 0.5 ? Math.ceil(index) : Math.floor(index);
    var y = twf_data[index];
    y = (0.5 + 0.5 * y) * 16;
    y = y % 1 > 0.5 ? Math.ceil(y) : Math.floor(y);
    y = y & 0x1f;
    twf_preview.writeUInt8(y, i + offset);
  }

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + twf_preview_tag_len, 8);
  return Buffer.concat([currentData, twf_preview]);
}

// ----- only for EXT -----
//PCO2, cue_list2
function addCue2TagData(track_cue_data, currentData, type) {
  const track_cues =
    track_cue_data === undefined || track_cue_data === null
      ? []
      : track_cue_data;
  // constant values
  const cue_head_len = 20;
  const cue_entry_len = 88;
  const cue_entry_header = 16;

  const filtered_cues = [];
  const filtered_nums = [];

  // ----- compute the size of cue and beat tag -----
  var cue_tag_len = cue_head_len;
  for (let j = 0; j < track_cues.length; j++) {
    const current_cue = Number(track_cues[j].$.Num);

    if (
      filtered_nums.indexOf(current_cue) === -1 &&
      current_cue >= 0 &&
      current_cue <= 7
    ) {
      // filtering cue point
      filtered_nums.push(current_cue);
      filtered_cues.push(track_cues[j]);

      var comment = track_cues[j].$.comment;
      cue_tag_len += cue_entry_len;
      if (comment === undefined || comment === null) {
        comment = "";
      } else if (comment.length < 40) {
        cue_tag_len += comment.length;
      }
    }
  }

  const cue_count = filtered_cues.length; // count of POSITION_MARK tag in XML

  // Assumption values
  const t = 1;
  const loop_time = 4294967295;
  const color_id = 0;
  const l_enum = 0;
  const l_deno = 0;
  const color_code = 0;

  const cueTagData = Buffer.alloc(cue_tag_len);
  cueTagData.write("PCO2");
  cueTagData.writeUInt32BE(cue_head_len, 4);
  cueTagData.writeUInt32BE(cue_tag_len, 8);
  cueTagData.writeUInt32BE(type, 12);
  cueTagData.writeUInt16BE(cue_count, 16);

  var offset = 20;
  for (let k = 0; k < cue_count; k++) {
    var comment = filtered_cues[k].$.comment;
    if (comment === undefined || comment === null) {
      comment = "";
    }
    const hot_cue = Number(filtered_cues[k].$.Num) + 1;
    const time = Number(filtered_cues[k].$.Start) * 1000;

    const len_comment = comment.length;
    const len_entry = cue_entry_len;
    if (len_comment > 40) {
      len_entry += len_comment - 40;
    }
    const red = Number(filtered_cues[k].$.Red);
    const green = Number(filtered_cues[k].$.Green);
    const blue = Number(filtered_cues[k].$.Blue);

    cueTagData.write("PCP2", offset);
    cueTagData.writeUInt32BE(cue_entry_header, offset + 4);
    cueTagData.writeUInt32BE(len_entry, offset + 8);
    cueTagData.writeUInt32BE(hot_cue, offset + 12);
    cueTagData.writeUInt8(t, offset + 16);
    cueTagData.writeUInt32BE(time, offset + 20);
    cueTagData.writeUInt32BE(loop_time, offset + 24);
    cueTagData.writeUInt8(color_id, offset + 28);
    cueTagData.writeUInt16BE(l_enum, offset + 36);
    cueTagData.writeUInt16BE(l_deno, offset + 38);
    cueTagData.writeUInt32BE(len_comment, offset + 40);
    cueTagData.write(comment, offset + 44);
    cueTagData.writeUInt8(color_code, offset + 44 + len_comment);
    cueTagData.writeUInt8(red, offset + 45 + len_comment);
    cueTagData.writeUInt8(green, offset + 46 + len_comment);
    cueTagData.writeUInt8(blue, offset + 47 + len_comment);

    offset += len_entry;
  }
  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + cue_tag_len, 8);
  return Buffer.concat([currentData, cueTagData]);
}
// PQT2, beat_list2
function addBeat2TagData(track_beats, total_time, currentData) {
  // constant values
  const head_len = 56;
  const entry_len = 2;
  const beat_per_min = track_beats[0].$.Bpm;
  const beat_per_sec = beat_per_min / 60;
  const beat_gap = 1 / beat_per_sec;

  const u1 = 16777218;
  const u2 = 35864865;

  var beat_count = total_time / beat_gap; // track_beats.length; // count of TEMPO tag in XML
  beat_count =
    beat_count % 1 > 0.5 ? Math.ceil(beat_count) : Math.floor(beat_count);
  const tag_len = head_len + entry_len * beat_count; // size of beat tag

  const beatData = Buffer.alloc(tag_len);
  beatData.write("PQT2");
  beatData.writeUInt32BE(head_len, 4);
  beatData.writeUInt32BE(tag_len, 8);
  beatData.writeUInt32BE(u1, 16);

  // add the 2 beat tags
  if (track_beats.length >= 2) {
    const beat_num1 = Number(track_beats[0].$.Battito)
      ? Number(track_beats[0].$.Battito)
      : 0;
    const beat_time1 = Number(track_beats[0].$.Inizio)
      ? Number(track_beats[0].$.Inizio)
      : 0;
    const beat_bpm1 = Number(track_beats[0].$.Bpm);
    const beat_num2 = Number(track_beats[1].$.Battito)
      ? Number(track_beats[1].$.Battito)
      : 0;
    const beat_time2 = Number(track_beats[1].$.Inizio)
      ? Number(track_beats[1].$.Inizio)
      : 0;
    const beat_bpm2 = Number(track_beats[1].$.Bpm);
    beatData.writeUInt16BE(beat_num1, 24);
    beatData.writeUInt16BE(beat_bpm1 * 100, 26);
    beatData.writeUInt32BE(beat_time1, 28);
    beatData.writeUInt16BE(beat_num2, 32);
    beatData.writeUInt16BE(beat_bpm2 * 100, 34);
    beatData.writeUInt32BE(beat_time2, 36);
  }

  beatData.writeUInt32BE(beat_count, 40);
  beatData.writeUInt32BE(u2, 44);

  var init_beat = Number(track_beats[0].$.Battito)
    ? Number(track_beats[0].$.Battito)
    : 1;

  for (let l = 0; l < beat_count; l++) {
    const beat = ((init_beat + l - 1) % 4) + 1;
    const unknown = Math.floor(Math.random() * 256);
    beatData.writeUInt8(beat, head_len + l * entry_len);
    beatData.writeUInt8(unknown, head_len + l * entry_len + 1);
  }
  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + tag_len, 8);
  return Buffer.concat([currentData, beatData]);
}
// PWV3
function addWaveformDetail(wf_data, currentData) {
  // constant values
  const wf_detail_head_len = 24;
  const wf_detail_len = wf_data.length;
  const wf_detail_tag_len = wf_detail_head_len + wf_detail_len;
  const wf_detail_entry_len = 1;

  // Assumption values
  const u1 = 9830400;

  const wf_detail = Buffer.alloc(wf_detail_tag_len);
  wf_detail.write("PWV3");
  wf_detail.writeUInt32BE(wf_detail_head_len, 4);
  wf_detail.writeUInt32BE(wf_detail_tag_len, 8);
  wf_detail.writeUInt32BE(wf_detail_entry_len, 12);
  wf_detail.writeUInt32BE(wf_detail_len, 16);
  wf_detail.writeUInt32BE(u1, 20);

  const offset = 24;
  for (let i = 0; i < wf_detail_len; i++) {
    var y = (0.5 + 0.5 * wf_data[i]) * 32;
    y = y % 1 > 0.5 ? Math.ceil(y) : Math.floor(y);
    y = y & 0x1f;

    const whiteness = 5; // assumption value
    const wf_entry = whiteness * 32 + y;

    wf_detail.writeUInt8(wf_entry, i + offset);
  }

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + wf_detail_tag_len, 8);
  return Buffer.concat([currentData, wf_detail]);
}
// PWV5, wf_color_detail
function addWaveformColorDetail(wf_data, currentData) {
  // constant values
  const head_len = 24;
  const entries_len = wf_data.length;
  const entry_byte = 2;
  const tag_len = head_len + entries_len * entry_byte;

  // Assumption value
  const u1 = 9831173;

  const wf_color = Buffer.alloc(tag_len);
  wf_color.write("PWV5");
  wf_color.writeUInt32BE(head_len, 4);
  wf_color.writeUInt32BE(tag_len, 8);
  wf_color.writeUInt32BE(entry_byte, 12);
  wf_color.writeUInt32BE(entries_len, 16);
  wf_color.writeUInt32BE(u1, 20);

  const offset = head_len;
  for (let i = 0; i < entries_len; i++) {
    var y = wf_data[i];
    y = (0.5 + 0.5 * y) * 32;
    y = y % 1 > 0.5 ? Math.ceil(y) : Math.floor(y);
    y = y & 0x1f;
    // Assumption value
    const r = 0;
    const g = 1;
    const b = 6;
    const wf_entry = (r << 14) + (g << 10) + (b << 7) + (y << 2);
    wf_color.writeUInt16BE(wf_entry, i * entry_byte + offset);
  }

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + tag_len, 8);
  return Buffer.concat([currentData, wf_color]);
}
// PWV4, wf_color_preview
function addWaveformColorPreview(wf_data, currentData) {
  // constant values
  const head_len = 24;
  const len_entry_bytes = 6;
  const len_entries = 1200;
  const len_tag = head_len + len_entry_bytes * len_entries;

  // Assumption values
  const u1 = 0;

  const wf_color_preview = Buffer.alloc(len_tag);
  wf_color_preview.write("PWV4");
  wf_color_preview.writeUInt32BE(head_len, 4);
  wf_color_preview.writeUInt32BE(len_tag, 8);
  wf_color_preview.writeUInt32BE(len_entry_bytes, 12);
  wf_color_preview.writeUInt32BE(len_entries, 16);
  wf_color_preview.writeUInt32BE(u1, 20);

  const offset = head_len;

  var min = 0,
    max = 0;
  for (let i = 0; i < wf_data.length; i++) {
    if (Math.abs(wf_data[i]) > max) max = Math.abs(wf_data[i]);
    if (Math.abs(wf_data[i]) < min) min = Math.abs(wf_data[i]);
  }
  console.log("min=", min, "max=", max);
  var y_unit = 255 / max;

  for (let i = 0; i < len_entries; i++) {
    var index = (wf_data.length / len_entries) * i;
    index = Math.floor(index); // index % 1 > 0.5 ? Math.ceil(index) : Math.floor(index);

    var y = Math.floor(Math.abs(wf_data[index]) * y_unit);

    const d2 = 255 - y;
    var red, green, blue;
    if (y > 150) {
      red = y;
      green = y * 0.2;
      blue = y * 0.1;
    } else if (y > 100) {
      red = y;
      green = y * 0.3;
      blue = y * 0.15;
    } else if (y > 50) {
      red = y;
      green = y * 0.4;
      blue = y * 0.2;
    } else if (y > 20) {
      red = y * 0.4;
      green = y * 1.4;
      blue = y * 0.5;
    } else {
      red = y * 0.2;
      green = y * 1.7;
      blue = y;
    }
    wf_color_preview.writeUInt8(y, offset + i * 6);
    wf_color_preview.writeUInt8(d2, offset + i * 6 + 1);
    wf_color_preview.writeUInt8(y, offset + i * 6 + 2);
    wf_color_preview.writeUInt8(red, offset + i * 6 + 3);
    wf_color_preview.writeUInt8(green, offset + i * 6 + 4);
    wf_color_preview.writeUInt8(blue, offset + i * 6 + 5);
  }

  const len_file = currentData.readUInt32BE(8);
  currentData.writeUInt32BE(len_file + len_tag, 8);
  return Buffer.concat([currentData, wf_color_preview]);
}

function writeBufferToFile(writeData, output_path) {
  ensureDirectoryExistence(output_path);
  fs.writeFile(output_path, writeData, (err) => {
    if (err) {
      console.error("Error writing binary file:", err);
    } else {
      console.log(`${output_path} written successfully.`);
    }
  });
}

function getAnlzFilePath(pdb_path, track_path) {
  const data = fs.readFileSync(pdb_path);
  const pdb_header = getPDBHeader(data);
  const tables = getTablePoint(data, pdb_header);
  const page_num = tables[tables.length - 1].last_page;
  var track_rows = {};
  for (let i = 1; i <= page_num; i++) {
    const start = i * pdb_header.len_page;
    const end = (i + 1) * pdb_header.len_page;
    const table_page = data.slice(start, end);
    const page_info = getPageInfo(table_page);
    if (page_info.table_type === "tracks" && page_info.nrs > page_info.num_rl) {
      track_rows = getRowInfo(pdb_header, table_page);
    }
  }
  const len = track_rows.length;
  var anlz_data = {};
  for (let i = 0; i < len; i++) {
    const { track_file_path } = track_rows[i].row_info;
    if (
      track_file_path === track_path ||
      track_file_path.includes(track_path)
    ) {
      anlz_data = track_rows[i].row_info;
    }
  }

  return anlz_data;
}

function writeFromParsedData(parsedData, path_data, usbDrive) {
  const Entries = parsedData.DJ_PLAYLISTS.COLLECTION[0].$.Entries; // number of track in collection
  console.log("Your platform is", platform);
  for (let i = 0; i < Entries; i++) {
    // make the file header
    const header_DAT = getFileHeader(28);

    // ----- get the track informations -----
    const location = parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.Location;
    var track_location;
    if (platform === "darwin") {
      track_location = "/" + location.slice(17);
    } else if (platform === "win32") {
      track_location = location.slice(17);
    }
    const track_file_path = decodeURIComponent(track_location); // track_location.replace(/%20/g, " ");
    const track_id = Number(
      parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.TrackID
    );

    // track file path
    var artist = parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.Artist;
    var album = parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.Album;
    album = album === "" || album === undefined ? "UnknownAlbum" : album;
    artist = artist === "" || artist === undefined ? "UnknownArtist" : artist;

    const path_index = path_data.findIndex(
      (element) => element.unknown2 === track_id
    ); // track_file_path.lastIndexOf("/");
    const track_path =
      // "/Contents/" +
      // artist +
      // "/" +
      // album +
      path_data[path_index].row_info.track_file_path; // track_file_path.slice(path_index);
    const track_path_usb = usbDrive + track_path;

    const output_path = "./outputs_wav/" + track_id.toString() + ".wav";
    ensureDirectoryExistence(output_path);
    extractWaveform(track_path_usb, output_path, (waveform) => {
      const samples = waveform;

      console.log("Track path in usb", track_path);

      // ----- DAT file export -----
      var anlz_dat = addPathTagData(
        track_path + "\0", // --- track_path_usb + "\0", // parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.Location
        header_DAT
      ); // Add Path Tag(PPTH) data

      anlz_dat = addVBRTagData(anlz_dat); // Add PVBR tag

      const total_time = Number(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.TotalTime
      );

      anlz_dat = addBeatTagData(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].TEMPO,
        total_time,
        anlz_dat
      ); // Add Beat Tag(PQTZ) Data

      anlz_dat = addWaveformPreview(samples, anlz_dat); // Add Waveform Preview Tag(PWAV) Data
      anlz_dat = addWaveformTinyPreview(samples, anlz_dat); // Add Tiny Waveform Preview Tag(PWV2) Data

      anlz_dat = addCueTagData(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].POSITION_MARK,
        anlz_dat,
        true,
        1
      ); //  Add Cue Tag(PCOB) Data
      anlz_dat = addCueTagData([], anlz_dat, true, 0); // Add empty Cue (Memory Type)

      // const pdb_path = usbDrive + "/PIONEER/rekordbox/export.pdb";
      // var { anlz_path } = getAnlzFilePath(pdb_path, track_path);
      var anlz_path = path_data[i].row_info.anlz_path;
      anlz_path = usbDrive + anlz_path;

      writeBufferToFile(anlz_dat, anlz_path); // write buffer to .DAT file

      // ----- EXT file export -----
      const header_EXT = getFileHeader(28); // make the file header

      var anlz_ext = addPathTagData(
        track_path + "\0", // --- track_path_usb + "\0", "/Contents/Kevin MacLeod/Royalty Free/2.mp3\0", // parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].$.Location
        header_EXT
      ); // Add path tag data

      anlz_ext = addWaveformDetail(samples, anlz_ext);

      anlz_ext = addCueTagData(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].POSITION_MARK,
        anlz_ext,
        false,
        1
      ); // Add Cue Tag Data (HotCue Type)
      anlz_ext = addCueTagData([], anlz_ext, false, 0); // Add empty Cue (Memory Type)

      anlz_ext = addCue2TagData(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].POSITION_MARK,
        anlz_ext,
        1
      ); // Add Extended Cue Tag Data (HotCue Type)
      anlz_ext = addCue2TagData([], anlz_ext, 0); // Add empty Extended Cue (Memory Type)

      anlz_ext = addBeat2TagData(
        parsedData.DJ_PLAYLISTS.COLLECTION[0].TRACK[i].TEMPO,
        total_time,
        anlz_ext
      ); // Add Extended Beat Tag Data (beat_grid2)

      anlz_ext = addWaveformColorDetail(samples, anlz_ext); // Add Waveform Color Detail Tags (PWV5)
      anlz_ext = addWaveformColorPreview(samples, anlz_ext); // Add Waveform Color Preview Tags (PWV4)

      const dot_index = anlz_path.lastIndexOf(".");
      const anlz_path_ext = anlz_path.slice(0, dot_index) + ".EXT";
      writeBufferToFile(anlz_ext, anlz_path_ext); // write buffer to .EXT file

      // delete the wav files
      deleteFile(output_path);
    });
  }
}

module.exports = { writeFromParsedData };
