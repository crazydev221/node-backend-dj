const fs = require("fs");
const { deleteZeroTail, getStringFromPDB } = require("../utils/helpfunc");

const file_path = "H:/PIONEER/rekordbox/export.pdb"; // "export.pdb"; // "H:/PIONEER/rekordbox/export.pdb";

const data = fs.readFileSync(file_path);

function getFileHeader(data) {
  const len_page = data.readUInt32LE(4);
  const num_tables = data.readUInt32LE(8);
  const next_u = data.readUInt32LE(12);
  const unknown = data.readUInt32LE(16);
  const sequence = data.readUInt32LE(20);
  const test = data.readUInt32LE(24);
  return {
    len_page,
    num_tables,
    next_u,
    unknown,
    sequence,
    test,
  };
}

function getTableType(type) {
  switch (type) {
    case 0:
      return "tracks";
    case 1:
      return "genres";
    case 2:
      return "artists";
    case 3:
      return "albums";
    case 4:
      return "labels";
    case 5:
      return "keys";
    case 6:
      return "colors";
    case 7:
      return "playlist_tree";
    case 8:
      return "playlist_entries";
    case 13:
      return "artwork";
    case 16:
      return "columns";
    case 17:
      return "history_playlists";
    case 18:
      return "history_entries";
    case 19:
      return "history";
    default:
      return "unknown_table";
  }
}

function getTablePoint(data, file_header) {
  const len_header = 28;
  let offset = len_header;
  const tables = [];
  for (let i = 0; i < file_header.num_tables; i++) {
    const type = data.readUInt32LE(offset);
    const empty_c = data.readUInt32LE(offset + 4);
    const first_page = data.readUInt32LE(offset + 8);
    const last_page = data.readUInt32LE(offset + 12);

    tables.push({ type, empty_c, first_page, last_page });

    offset += 16;
  }
  return tables;
}

function getPageInfo(table_page) {
  // const table_test = table_page.readUInt32LE(0);

  const page_index = table_page.readUInt32LE(4);
  const table_type = getTableType(table_page.readUInt32LE(8));
  const next_page = table_page.readUInt32LE(12);
  const unknown1 = table_page.readUInt32LE(16);
  const unknown2 = table_page.readUInt32LE(20);
  const nrs = table_page.readUInt8(24);
  const u3 = table_page.readUInt8(25);
  const u4 = table_page.readUInt8(26);
  const pf = table_page.readUInt8(27);
  const free_s = table_page.readUInt16LE(28);
  const used_s = table_page.readUInt16LE(30);
  const u5 = table_page.readUInt16LE(32);
  const num_rl = table_page.readUInt16LE(34);
  const u6 = table_page.readUInt16LE(36);
  const u7 = table_page.readUInt16LE(38);

  const table_data = {
    page_index,
    table_type,
    next_page,
    unknown1,
    unknown2,
    nrs,
    u3,
    u4,
    pf, // page_flag
    free_s,
    used_s,
    u5,
    num_rl,
    u6,
    u7,
  };

  return table_data;
}

function getRowInfo(table_page) {
  const { page_index, table_type, nrs, used_s, num_rl } =
    getPageInfo(table_page);

  const row_info = [];

  if (page_index === 0) return [];

  const table_page_header = 40;

  const heap_data = table_page.slice(
    table_page_header,
    table_page_header + used_s
  );

  let of_pos = file_header.len_page;
  const ofs = [];
  const row_pf = [];

  var num_row;
  if (num_rl === 8191) num_row = nrs;
  else num_row = Math.max(num_rl, nrs);

  for (let j = 0; j < num_row; j++) {
    if (j % 16 === 0) {
      of_pos -= 4;
      row_pf.push(table_page.readUInt16LE(of_pos));
    }
    of_pos -= 2;
    ofs.push(table_page.readUInt16LE(of_pos));
  }
  console.log(row_pf, ofs);

  for (let j = 0; j < num_row; j++) {
    // if (ofs[j + 1] === 0) continue;
    const row_data = heap_data.slice(ofs[j], ofs[j + 1]);
    const row_enable = Math.floor(
      (row_pf[Math.floor(j / 16)] / Math.pow(2, j % 16)) % 2
    );
    if (row_enable) {
      switch (table_type) {
        case "tracks":
          row_info.push(getTrackRowInfo(row_data));
          break;
        case "albums":
          row_info.push(getAlbumRowInfo(row_data));
          break;
        case "artists":
          row_info.push(getArtistRowInfo(row_data));
          break;
        case "artwork":
          row_info.push(getArtworkRowInfo(row_data));
          break;
        case "colors":
          row_info.push(getColorRowInfo(row_data));
          break;
        case "genres":
          row_info.push(getGenreRowInfo(row_data));
          break;
        case "history_playlists":
          row_info.push(getHistoryPlaylistRowInfo(row_data));
          break;
        case "history_entries":
          row_info.push(getHistoryEntryRowInfo(row_data));
          break;
        case "keys":
          row_info.push(getKeyRowInfo(row_data));
          break;
        case "labels":
          row_info.push(getGenreRowInfo(row_data));
          break;
        case "playlist_tree":
          row_info.push(getPlaylistTreeRowInfo(row_data));
          break;
        case "playlist_entries":
          row_info.push(getPlayListEntryRowInfo(row_data));
          break;
        case "columns":
          row_info.push(getColumnRowInfo(row_data));
          break;
        case "history":
          row_info.push(getHistoryRowInfo(row_data));
          break;
        default:
          console.log("row ---> ", row_data.toString("utf-8"));
          break;
        // return;
      }
    }
  }
  return row_info;
}

function getTrackRowInfo(row_data) {
  const u1 = row_data.readUInt16LE(0);
  const i_shift = row_data.readUInt16LE(2);
  const bitmask = row_data.readUInt32LE(4);
  const sample_rate = row_data.readUInt32LE(8);
  const composer_id = row_data.readUInt32LE(12);
  const file_size = row_data.readUInt32LE(16);
  const unknown2 = row_data.readUInt32LE(20);
  const u3 = row_data.readUInt16LE(24);
  const u4 = row_data.readUInt16LE(26);
  const artwork_id = row_data.readUInt32LE(28);
  const key_id = row_data.readUInt32LE(32);
  const orig_artist_id = row_data.readUInt32LE(36);
  const label_id = row_data.readUInt32LE(40);
  const remixer_id = row_data.readUInt32LE(44);
  const bitrate = row_data.readUInt32LE(48);
  const track_number = row_data.readUInt32LE(52);
  const tempo = row_data.readUInt32LE(56);
  const genre_id = row_data.readUInt32LE(60);
  const album_id = row_data.readUInt32LE(64);
  const artist_id = row_data.readUInt32LE(68);
  const id = row_data.readUInt32LE(72);
  const disc_n = row_data.readUInt16LE(76);
  const play_c = row_data.readUInt16LE(78);
  const year = row_data.readUInt16LE(80);
  const s_depth = row_data.readUInt16LE(82);
  const dur = row_data.readUInt16LE(84);
  const u5 = row_data.readUInt16LE(86);
  const c_id = row_data.readUInt8(88);
  const r = row_data.readUInt8(89);
  const u6 = row_data.readUInt16LE(90);
  const u7 = row_data.readUInt16LE(92);

  const track_offset = [];
  for (let k = 0; k <= 20; k++) {
    track_offset.push(row_data.readUInt16LE(94 + k * 2));
  }
  // console.log("...", track_offset);
  const isrc = row_data.toString("utf-8", track_offset[0] + 1, track_offset[1]);
  const texter = row_data.toString(
    "utf-8",
    track_offset[1] + 1,
    track_offset[2]
  );
  const unknown_string_2 = row_data.toString(
    "utf-8",
    track_offset[2] + 1,
    track_offset[3]
  );
  const unknown_string_3 = row_data.toString(
    "utf-8",
    track_offset[3] + 1,
    track_offset[4]
  );
  const unknown_string_4 = row_data.toString(
    "utf-8",
    track_offset[4] + 1,
    track_offset[5]
  );
  const message = row_data.toString(
    "utf-8",
    track_offset[5] + 1,
    track_offset[6]
  );
  const kuvo_public = row_data.toString(
    "utf-8",
    track_offset[6] + 1,
    track_offset[7]
  );
  const autoload_hotcues = row_data.toString(
    "utf-8",
    track_offset[7] + 1,
    track_offset[8]
  );
  const unknown_string_5 = row_data.toString(
    "utf-8",
    track_offset[8] + 1,
    track_offset[9]
  );
  const unknown_string_6 = row_data.toString(
    "utf-8",
    track_offset[9] + 1,
    track_offset[10]
  );
  const date_added = row_data.toString(
    "utf-8",
    track_offset[10] + 1,
    track_offset[11]
  );
  const release_date = row_data.toString(
    "utf-8",
    track_offset[11] + 1,
    track_offset[12]
  );
  const mix_name = row_data.toString(
    "utf-8",
    track_offset[12] + 1,
    track_offset[13]
  );
  const unknown_string_7 = row_data.toString(
    "utf-8",
    track_offset[13] + 1,
    track_offset[14]
  );
  const anlz_path = row_data.toString(
    "utf-8",
    track_offset[14] + 1,
    track_offset[15]
  );
  const anlz_date = row_data.toString(
    "utf-8",
    track_offset[15] + 1,
    track_offset[16]
  );
  const comment = row_data.toString(
    "utf-8",
    track_offset[16] + 1,
    track_offset[17]
  );
  const title = row_data.toString(
    "utf-8",
    track_offset[17] + 1,
    track_offset[18]
  );
  const unknown_string_8 = row_data.toString(
    "utf-8",
    track_offset[18] + 1,
    track_offset[19]
  );
  const file_name = row_data.toString(
    "utf-8",
    track_offset[19] + 1,
    track_offset[20]
  );
  const track_file_path = getStringFromPDB(row_data, track_offset[20]);
  const row_info = {
    isrc,
    texter,
    unknown_string_2,
    unknown_string_3,
    unknown_string_4,
    message,
    kuvo_public,
    autoload_hotcues,
    unknown_string_5,
    unknown_string_6,
    date_added,
    release_date,
    mix_name,
    unknown_string_7,
    anlz_path,
    anlz_date,
    comment,
    title,
    unknown_string_8,
    file_name,
    track_file_path,
  };

  return {
    u1, // 0
    i_shift, // 2
    bitmask, // 4
    sample_rate, // 8
    composer_id, // 12
    file_size, // 16
    unknown2, // 20
    u3, // 24
    u4, // 26
    artwork_id, // 28
    key_id, // 32
    orig_artist_id, // 36
    label_id, // 40
    remixer_id, // 44
    bitrate, // 48
    track_number, // 52
    tempo, // 56
    genre_id, // 60
    album_id, // 64
    artist_id, // 68
    id, // 72
    disc_n, // 76
    play_c, // 78
    year, // 80
    s_depth, // 82
    dur, // 84
    u5, // 86
    c_id, // 88
    r, // 89
    u6, // 90
    u7, // 92
    row_info,
  };
}

function getAlbumRowInfo(row_data) {
  const u1 = row_data.readUInt16LE(0);
  const i_shift = row_data.readUInt16LE(2);
  const unknown2 = row_data.readUInt32LE(4);
  const artist_id = row_data.readUInt32LE(8);
  const id = row_data.readUInt32LE(12);
  const unknown3 = row_data.readUInt32LE(16);
  const u4 = row_data.readUInt8(20);
  const on = row_data.readUInt8(21);
  const album_name = getStringFromPDB(row_data, 22);

  return {
    u1,
    unknown2,
    i_shift,
    artist_id,
    id,
    unknown3,
    u4,
    on,
    album_name,
  };
}

function getArtistRowInfo(row_data) {
  const type = row_data.readUInt16LE(0);
  const i_shift = row_data.readUInt16LE(2);
  const id = row_data.readUInt32LE(4);
  const u1 = row_data.readUInt8(8);
  const on = row_data.readUInt8(9);
  var ofar;
  if (type === 100) {
    ofar = row_data.readUInt16LE(10);
  }
  var artist_name = getStringFromPDB(row_data, type === 96 ? on : ofar);

  if (type === 96) {
    return {
      type,
      i_shift,
      id,
      u1,
      on,
      artist_name,
    };
  } else {
    return {
      type,
      i_shift,
      id,
      u1,
      on,
      ofar,
      artist_name,
    };
  }
}

function getArtworkRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const path = getStringFromPDB(row_data, 4);
  return {
    id,
    path,
  };
}

function getColorRowInfo(row_data) {
  const unknown1 = row_data.readUInt32LE(0);
  const u2 = row_data.readUInt8(4);
  const id = row_data.readUInt16LE(5);
  const u3 = row_data.readUInt8(7);
  const color_name = getStringFromPDB(row_data, 8);
  return {
    unknown1,
    u2,
    id,
    u3,
    color_name,
  };
}

function getColumnRowInfo(row_data) {
  const id = row_data.readUInt16LE(0);
  const number = row_data.readUInt16LE(2);
  const unknown1 = row_data.readUInt8(4);
  const len = row_data.readUInt8(5);
  const u2 = row_data.readUInt16LE(6);
  const u3 = row_data.readUInt8(8);
  const u33 = row_data.readUInt8(9);
  const column_name = deleteZeroTail(
    row_data.toString("utf-16le", 10, row_data.length - 2)
  );
  const u4 = row_data.readUInt16LE(row_data.length - 4);
  const u5 = row_data.readUInt16LE(row_data.length - 2);
  return {
    id,
    number,
    unknown1,
    len,
    u2,
    u3,
    u33,
    column_name,
    u4,
    u5,
  };
}

function getGenreRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const genre_name = getStringFromPDB(row_data, 4);

  return {
    id,
    genre_name,
  };
}

function getHistoryPlaylistRowInfo(row_data) {
  const u1 = row_data.readUInt16LE(0);
  const u2 = row_data.readUInt16LE(2);
  const u3 = row_data.readUInt8(4);
  const u4 = row_data.readUInt8(5);
  const u5 = row_data.readUInt16LE(6);
  // const name = deleteZeroTail(row_data.toString("utf-8", 4));
  return {
    u1,
    u2,
    u3,
    u4,
    u5,
  };
}

function getHistoryEntryRowInfo(row_data) {
  /// some bugs ///
  const track_id = row_data.readUInt16LE(0);
  const playlist_id = row_data.readUInt16LE(2);
  const entry_index = row_data.readUInt32LE(4);
  return {
    track_id,
    playlist_id,
    entry_index,
  };
}

function getHistoryRowInfo(row_data) {
  const unknown1 = row_data.readUInt8(0);
  const u2 = row_data.readUInt8(1);
  const u3 = row_data.readUInt8(2);
  const u4 = row_data.readUInt16LE(3);
  const u5 = row_data.readUInt32LE(5);
  const u6 = row_data.readUInt16LE(9);
  const u7 = row_data.readUInt8(11);
  const date = row_data.toString("utf-8", 13, 23);
  const u8 = row_data.readUInt8(23);
  const u9 = row_data.readUInt8(24);
  // const u10 = row_data.readUInt8(25);
  const num = row_data.toString("utf-8", 26, 30);
  const u10 = row_data.readUInt16LE(30);

  return {
    unknown1,
    u2,
    u3,
    u4,
    u5,
    u6,
    u7,
    date,
    u8,
    u9,
    // u10,
    num,
    u10,
  };
}

function getKeyRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const id2 = row_data.readUInt32LE(4);
  const key_name = getStringFromPDB(row_data, 8);
  return {
    id,
    id2,
    key_name,
  };
}

function getPlaylistTreeRowInfo(row_data) {
  const parent_id = row_data.readUInt32LE(0);
  const unknown = row_data.readUInt32LE(4);
  const sort_order = row_data.readUInt32LE(8);
  const id = row_data.readUInt32LE(12);
  const raw_is_folder = row_data.readUInt32LE(16);
  const name = getStringFromPDB(row_data, 20);
  return {
    parent_id,
    unknown,
    sort_order,
    id,
    raw_is_folder,
    name,
  };
}

function getPlayListEntryRowInfo(row_data) {
  const entry_index = row_data.readUInt32LE(0);
  const track_id = row_data.readUInt32LE(4);
  const playlist_id = row_data.readUInt32LE(8);
  return {
    entry_index,
    track_id,
    playlist_id,
  };
}

function getPageNumberFromPointer(pointer) {
  var num = 0;
  for (let i = 0; i < pointer.length; i++) {
    if (num < pointer[i].last_page) {
      num = pointer[i].last_page;
    }
  }
  return num;
}

// ----- File header -----
const file_header = getFileHeader(data);

console.log("----- File Header -----\n", file_header);
// console.log("test", test === 0); // must be 0

// ----- Table points -----
const tables = getTablePoint(data, file_header);
console.log("----- Table points -----\n", tables);

const page_num = getPageNumberFromPointer(tables);

for (let i = 1; i <= page_num; i++) {
  const start_point = i * file_header.len_page;
  const end_point = (i + 1) * file_header.len_page;

  const table_page = data.slice(start_point, end_point);
  const table_info = getPageInfo(table_page);
  if (table_info.page_index === 0) continue;
  // console.log(table_info, ",");
  if (
    table_info.table_type === "tracks" &&
    table_info.page_index !== 0 &&
    (table_info.pf === 36 || table_info.pf === 52)
  ) {
    console.log(
      `----- ${table_info.table_type} Table header -----\n`,
      table_info
    );
    console.log(table_info.table_type);
    const rows = getRowInfo(table_page);
    console.log(`----- ${table_info.table_type} Row Info -----\n`, rows);
  }
}
