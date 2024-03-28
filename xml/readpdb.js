// const fs = require("fs");

// const file_path = "H:/PIONEER/rekordbox/export.pdb";

// const data = fs.readFileSync(file_path);

function getPDBHeader(data) {
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

function getRowInfo(file_header, table_page) {
  const { page_index, table_type, nrs, used_s, num_rl } =
    getPageInfo(table_page);

  const row_info = [];

  if (num_rl !== 8191 && nrs > num_rl && page_index !== 0) {
    const table_page_header = 40;

    const heap_data = table_page.slice(
      table_page_header,
      table_page_header + used_s
    );

    let of_pos = file_header.len_page;
    const ofs = [];
    const row_pf = [];

    for (let j = 0; j < nrs; j++) {
      if (j % 16 === 0) {
        of_pos -= 4;
        row_pf.push(table_page.readUInt16LE(of_pos));
      }
      of_pos -= 2;
      ofs.push(table_page.readUInt16LE(of_pos));
    }
    // console.log(ofs, row_pf);

    for (let j = 0; j < nrs; j++) {
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
          // default:
          //   return;
        }
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
  const artword_id = row_data.readUInt32LE(28);
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
  const anlz_path = row_data.toString(
    "utf-8",
    track_offset[14] + 1,
    track_offset[15]
  );
  const title = row_data.toString(
    "utf-8",
    track_offset[17] + 1,
    track_offset[18]
  );
  const file_name = row_data.toString(
    "utf-8",
    track_offset[19] + 1,
    track_offset[20]
  );
  const track_file_path = deleteZeroTail(
    row_data.toString("utf-8", track_offset[20] + 1)
  );
  const row_info = { anlz_path, title, file_name, track_file_path };

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
    artword_id, // 28
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
  const on = row_data.readUInt8(22);
  const album_name = deleteZeroTail(row_data.toString("utf-8", 23));

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
  var artist_name = deleteZeroTail(
    row_data.toString("utf-8", type === 96 ? on + 1 : ofar + 1)
  );

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
  const path = deleteZeroTail(row_data.toString("utf-8", 5));
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
  const color_name = deleteZeroTail(row_data.toString("utf-8", 9));
  return {
    unknown1,
    u2,
    id,
    u3,
    color_name,
  };
}

function getGenreRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const genre_name = deleteZeroTail(row_data.toString("utf-8", 5));

  return {
    id,
    genre_name,
  };
}

function getHistoryPlaylistRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const name = deleteZeroTail(row_data.toString("utf-8", 4));
  return {
    id,
    name,
  };
}

function getHistoryEntryRowInfo(row_data) {
  /// some bugs ///
  // const track_id = row_data.readUInt32LE(0);
  const playlist_id = row_data.readUInt32LE(0);
  const entry_index = row_data.readUInt32LE(4);
  return {
    // track_id,
    playlist_id,
    entry_index,
  };
}

function getKeyRowInfo(row_data) {
  const id = row_data.readUInt32LE(0);
  const id2 = row_data.readUInt32LE(4);
  const key_name = deleteZeroTail(row_data.toString("utf-8", 9));
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
  const row_is_folder = row_data.readUInt32LE(16);
  const name = deleteZeroTail(row_data.toString("utf-8", 21));
  return {
    parent_id,
    unknown,
    sort_order,
    id,
    row_is_folder,
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

function deleteZeroTail(stringdata) {
  const index = stringdata.indexOf("\x00");
  if (index === -1) {
    return stringdata;
  }
  return stringdata.slice(0, index);
}

// // ----- File header -----
// const file_header = getPDBHeader(data);

// // console.log("----- File Header -----\n", file_header);
// // console.log("test", test === 0); // must be 0

// // ----- Table points -----
// const tables = getTablePoint(data, file_header);
// // console.log("----- Table points -----\n", tables);

// const page_num = tables[tables.length - 1].last_page;

// for (let i = 1; i < page_num; i++) {
//   const start_point = i * file_header.len_page;
//   const end_point = (i + 1) * file_header.len_page;

//   const table_page = data.slice(start_point, end_point);
//   const table_info = getPageInfo(table_page);
//   if (
//     table_info.table_type === "tracks" &&
//     table_info.nrs > table_info.num_rl
//   ) {
//     console.log("----- Track table header -----\n", table_info);
//     const track_rows = getTrackRowInfo(table_page);
//     console.log("----- Track Row Info -----\n", track_rows);
//   }
// }

module.exports = {
  getPDBHeader,
  getTablePoint,
  getTableType,
  getPageInfo,
  getRowInfo,
};
