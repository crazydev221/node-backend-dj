const fs = require("fs");
const os = require("os");
const {
  getTodayDate,
  intToHex,
  copyFile,
  ensureDirectoryExistence,
  getValidString,
  getValidNumber,
  isUTF16String,
  makeValidFilePath,
} = require("../utils/helpfunc");
const { extractArtwork } = require("../utils/artwork");

const platform = os.platform();

function writePDBHeader(pdb_header, pointer) {
  const { len_page, num_tables, next_u, unknown, sequence } = pdb_header;

  const headerData = Buffer.alloc(28);

  headerData.writeUInt32LE(0);
  headerData.writeUInt32LE(len_page, 4);
  headerData.writeUInt32LE(num_tables, 8);
  headerData.writeUInt32LE(next_u, 12);
  headerData.writeUInt32LE(unknown, 16);
  headerData.writeUInt32LE(sequence, 20);
  headerData.writeUInt32LE(0, 24);

  const table_pointer = writeTablePointer(len_page, pointer);

  return Buffer.concat([headerData, table_pointer]);
}

function writeTablePointer(len_page, pointer) {
  const len_header = 28;
  const table_points = Buffer.alloc(len_page - len_header);
  for (let i = 0; i < pointer.length; i++) {
    table_points.writeUInt32LE(pointer[i].type, i * 16);
    table_points.writeUInt32LE(pointer[i].empty_c, i * 16 + 4);
    table_points.writeUInt32LE(pointer[i].first_page, i * 16 + 8);
    table_points.writeUInt32LE(pointer[i].last_page, i * 16 + 12);
  }
  return table_points;
}

function writeTablePageHeader(header) {
  const {
    page_index,
    type,
    next_page,
    unknown1,
    unknown2,
    nrs,
    u3,
    u4,
    pf,
    free_s,
    used_s,
    u5,
    num_rl,
    u6,
    u7,
  } = header;

  const page_header = Buffer.alloc(40);

  page_header.writeUInt32LE(0, 0);
  page_header.writeUInt32LE(page_index, 4);
  page_header.writeUInt32LE(type, 8);
  page_header.writeUInt32LE(next_page, 12);
  page_header.writeUInt32LE(unknown1, 16);
  page_header.writeUInt32LE(unknown2, 20);
  page_header.writeUInt8(nrs, 24);
  page_header.writeUInt8(u3, 25);
  page_header.writeUInt8(u4, 26);
  page_header.writeUInt8(pf, 27);
  page_header.writeUInt16LE(free_s, 28);
  page_header.writeUInt16LE(used_s, 30);
  page_header.writeUInt16LE(u5, 32);
  page_header.writeUInt16LE(num_rl, 34);
  page_header.writeUInt16LE(u6, 36);
  page_header.writeUInt16LE(u7, 38);

  return page_header;
}

function writeTableHeader(header_data, offset, len_page, row_len) {
  const len_page_header = 40;
  const header = header_data;
  header.used_s = offset + 1;
  header.free_s =
    len_page -
    len_page_header -
    header.used_s -
    row_len * 2 -
    Math.ceil(row_len / 16) * 4;
  header.nrs = row_len;
  header.num_rl = header.nrs > 0 ? header.nrs - 1 : 0;
  return writeTablePageHeader(header, len_page);
}

function getNextPageIndex(page_header) {
  var max = 0;
  for (let i = 0; i < page_header.length; i++) {
    max = Math.max(page_header[i].next_page, max);
  }
  return max;
}

function writePDBData(file_header, pointer, phead, page_rows, len_page) {
  var pages = Buffer.alloc(0);

  for (let i = 1; i <= phead[phead.length - 1].page_index; i++) {
    const cur_index = phead.findIndex((element) => element.page_index === i);
    const cur_header = phead[cur_index];

    var page_data;
    var extra_tracks = [];

    if (cur_index === -1) {
      // Empty page
      page_data = writeEmptyPage(len_page);
    } else if (cur_header.pf === 68 || cur_header.pf === 100) {
      // Non Data Page
      page_data = writeNonDataPage(phead, cur_index, len_page);
    } else {
      // Valid Data Page
      const cur_row = page_rows[cur_header.type];
      switch (cur_header.type) {
        case 0:
          var data = writeTrackPage(cur_header, cur_row, len_page);
          page_data = data.page_data;
          extra_tracks = data.extra_rows;
          break;
        case 1:
          page_data = writeGenrePage(cur_header, cur_row, len_page);
          break;
        case 2:
          page_data = writeArtistPage(cur_header, cur_row, len_page);
          break;
        case 3:
          page_data = writeAlbumPage(cur_header, cur_row, len_page);
          break;
        case 4:
          page_data = writeGenrePage(cur_header, cur_row, len_page);
          break;
        case 5:
          page_data = writeKeyPage(cur_header, cur_row, len_page);
          break;
        case 6:
          page_data = writeColorPage(cur_header, cur_row, len_page);
          break;
        case 7:
          page_data = writePlaylistTreePage(cur_header, cur_row, len_page);
          break;
        case 8:
          page_data = writePlaylistEntryPage(cur_header, cur_row, len_page);
          break;
        case 13:
          page_data = writeArtworkPage(cur_header, cur_row, len_page);
          break;
        case 16:
          page_data = writeColumnPage(cur_header, cur_row, len_page);
          break;
        case 17:
          page_data = writeHistoryPlaylistPage(cur_header, cur_row, len_page);
          break;
        case 18:
          page_data = writeHistoryEntryPage(cur_header, cur_row, len_page);
          break;
        case 19:
          page_data = writeHistoryPage(cur_header, cur_row, len_page);
          break;
        default:
          page_data = writeUnknownPage(cur_header, len_page);
          break;
      }
    }

    if (extra_tracks.length !== 0) {
      page_rows[0] = extra_tracks;
      const extra_page_index = cur_header.next_page;
      const next_page_index = getNextPageIndex(phead) + 1;
      console.log("extra page index", extra_page_index);
      console.log("next page index", next_page_index);
      const extra_header = {
        page_index: extra_page_index,
        type: 0,
        next_page: next_page_index,
        unknown1: 56,
        unknown2: 0,
        nrs: extra_tracks.length,
        u3: 32,
        u4: 0,
        pf: 36,
        free_s: 0,
        used_s: 0,
        u5: 2,
        num_rl: 0,
        u6: 0,
        u7: 0,
      };
      phead.push(extra_header);
      pointer[0].last_page = extra_page_index;
      file_header.next_u = next_page_index + 1;
      pointer[0].empty_c = next_page_index;
      extra_tracks = [];
    }

    pages = Buffer.concat([pages, page_data]);
  }

  console.log(file_header, pointer);
  const pdb_header = writePDBHeader(file_header, pointer);
  return Buffer.concat([pdb_header, pages]);
}

function isSpaceAvailable(offset, track_i, len_page) {
  const len_header = 40;
  const available_space =
    len_page - len_header - track_i * 2 - Math.ceil(track_i / 16) * 4;
  return offset + 500 < available_space;
}

function writeTrackPage(header, rows, len_page) {
  console.log("write Track page");
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  var offset = 0;
  const row_ofs = [0];
  // const row_pf = [3];
  var i = 0;

  for (i = 0; i < rows.length; i++) {
    if (!isSpaceAvailable(offset, i, len_page)) {
      console.log("From", i, "th data, space is not available");
      break;
    }
    var ofs = new Array(21);
    // offset = row_ofs[i];
    page.writeUInt16LE(rows[i].u1, offset);
    page.writeUInt16LE(i * 32, offset + 2);
    page.writeUInt32LE(rows[i].bitmask, offset + 4);
    page.writeUInt32LE(rows[i].sample_rate, offset + 8);
    page.writeUInt32LE(rows[i].composer_id, offset + 12);
    page.writeUInt32LE(rows[i].file_size, offset + 16);
    page.writeUInt32LE(rows[i].unknown2, offset + 20);
    page.writeUInt16LE(rows[i].u3, offset + 24);
    page.writeUInt16LE(rows[i].u4, offset + 26);
    page.writeUInt32LE(rows[i].artwork_id, offset + 28);
    page.writeUInt32LE(rows[i].key_id, offset + 32);
    page.writeUInt32LE(rows[i].orig_artist, offset + 36);
    page.writeUInt32LE(rows[i].label_id, offset + 40);
    page.writeUInt32LE(rows[i].remixer_id, offset + 44);
    page.writeUInt32LE(rows[i].bitrate, offset + 48);
    page.writeUInt32LE(rows[i].track_number, offset + 52);
    page.writeUInt32LE(rows[i].tempo, offset + 56);
    page.writeUInt32LE(rows[i].genre_id, offset + 60);
    page.writeUInt32LE(rows[i].album_id, offset + 64);
    page.writeUInt32LE(rows[i].artist_id, offset + 68);
    page.writeUInt32LE(rows[i].id, offset + 72);
    page.writeUInt16LE(rows[i].disc_n, offset + 76);
    page.writeUInt16LE(rows[i].play_c, offset + 78);
    page.writeUInt16LE(rows[i].year, offset + 80);
    page.writeUInt16LE(rows[i].s_depth, offset + 82);
    page.writeUInt16LE(rows[i].dur, offset + 84);
    page.writeUInt16LE(rows[i].u5, offset + 86);
    page.writeUInt8(rows[i].c_id, offset + 88);
    page.writeUInt8(rows[i].r, offset + 89);
    page.writeUInt16LE(rows[i].u6, offset + 90);
    page.writeUInt16LE(rows[i].u7, offset + 92);

    var ofs_init = 136;

    // write row infomations
    page.writeUInt8(rows[i].row_info.isrc.length * 2 + 3, offset + ofs_init);
    page.write(rows[i].row_info.isrc, offset + ofs_init + 1);
    ofs[0] = ofs_init;
    ofs_init += rows[i].row_info.isrc.length + 1;

    page.writeUInt8(rows[i].row_info.texter.length * 2 + 3, offset + ofs_init);
    page.write(rows[i].row_info.texter, offset + ofs_init + 1);
    ofs[1] = ofs_init;
    ofs_init += rows[i].row_info.texter.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_2.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_2, offset + ofs_init + 1);
    ofs[2] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_2.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_3.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_3, offset + ofs_init + 1);
    ofs[3] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_3.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_4.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_4, offset + ofs_init + 1);
    ofs[4] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_4.length + 1;

    page.writeUInt8(rows[i].row_info.message.length * 2 + 3, offset + ofs_init);
    page.write(rows[i].row_info.message, offset + ofs_init + 1);
    ofs[5] = ofs_init;
    ofs_init += rows[i].row_info.message.length + 1;

    page.writeUInt8(
      rows[i].row_info.kuvo_public.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.kuvo_public, offset + ofs_init + 1);
    ofs[6] = ofs_init;
    ofs_init += rows[i].row_info.kuvo_public.length + 1;

    page.writeUInt8(
      rows[i].row_info.autoload_hotcues.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.autoload_hotcues, offset + ofs_init + 1);
    ofs[7] = ofs_init;
    ofs_init += rows[i].row_info.autoload_hotcues.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_5.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_5, offset + ofs_init + 1);
    ofs[8] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_5.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_6.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_6, offset + ofs_init + 1);
    ofs[9] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_6.length + 1;

    page.writeUInt8(
      rows[i].row_info.date_added.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.date_added, offset + ofs_init + 1);
    ofs[10] = ofs_init;
    ofs_init += rows[i].row_info.date_added.length + 1;

    page.writeUInt8(
      rows[i].row_info.release_date.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.release_date, offset + ofs_init + 1);
    ofs[11] = ofs_init;
    ofs_init += rows[i].row_info.release_date.length + 1;

    page.writeUInt8(
      rows[i].row_info.mix_name.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.mix_name, offset + ofs_init + 1);
    ofs[12] = ofs_init;
    ofs_init += rows[i].row_info.mix_name.length + 1;

    page.writeUInt8(
      rows[i].row_info.unknown_string_7.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_7, offset + ofs_init + 1);
    ofs[13] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_7.length + 1;

    page.writeUInt8(
      rows[i].row_info.anlz_path.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.anlz_path, offset + ofs_init + 1);
    ofs[14] = ofs_init;
    ofs_init += rows[i].row_info.anlz_path.length + 1;

    page.writeUInt8(
      rows[i].row_info.anlz_date.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.anlz_date, offset + ofs_init + 1);
    ofs[15] = ofs_init;
    ofs_init += rows[i].row_info.anlz_date.length + 1;

    page.writeUInt8(rows[i].row_info.comment.length * 2 + 3, offset + ofs_init);
    page.write(rows[i].row_info.comment, offset + ofs_init + 1);
    ofs[16] = ofs_init;
    ofs_init += rows[i].row_info.comment.length + 1;

    if (isUTF16String(rows[i].row_info.title)) {
      // when the string has special charactor, it had to be saved as utf-16
      page.writeUInt8(0x90, offset + ofs_init + 2);
      page.writeUInt16LE(
        rows[i].row_info.title.length * 2 + 4,
        offset + ofs_init + 3
      );
      page.write(rows[i].row_info.title, offset + ofs_init + 6, "utf-16le");
      ofs[17] = ofs_init + 2;
      ofs_init += 6 + rows[i].row_info.title.length * 2;
    } else if (rows[i].row_info.title.length < 126) {
      // when the short string, as the default
      page.writeUInt8(rows[i].row_info.title.length * 2 + 3, offset + ofs_init);
      page.write(rows[i].row_info.title, offset + ofs_init + 1);
      ofs[17] = ofs_init;
      ofs_init += rows[i].row_info.title.length + 1;
    } else {
      // when the long string than 126
      page.writeUInt8(64, offset + ofs_init + 2);
      page.writeUInt16LE(
        rows[i].row_info.title.length + 4,
        offset + ofs_init + 3
      );
      page.write(rows[i].row_info.title, offset + ofs_init + 6);
      ofs[17] = ofs_init + 2;
      ofs_init += rows[i].row_info.title.length + 6;
    }

    page.writeUInt8(
      rows[i].row_info.unknown_string_8.length * 2 + 3,
      offset + ofs_init
    );
    page.write(rows[i].row_info.unknown_string_8, offset + ofs_init + 1);
    ofs[18] = ofs_init;
    ofs_init += rows[i].row_info.unknown_string_8.length + 1;

    if (isUTF16String(rows[i].row_info.file_name)) {
      // when the string has special charactor, it had to be saved as utf-16
      page.writeUInt8(0x90, offset + ofs_init + 2);
      page.writeUInt16LE(
        rows[i].row_info.file_name.length * 2 + 4,
        offset + ofs_init + 3
      );
      page.write(rows[i].row_info.file_name, offset + ofs_init + 6, "utf-16le");
      ofs[19] = ofs_init + 2;
      ofs_init += 6 + rows[i].row_info.file_name.length * 2;
    } else {
      // else, the default case, no special charactor
      page.writeUInt8(
        rows[i].row_info.file_name.length * 2 + 3,
        offset + ofs_init
      );
      page.write(rows[i].row_info.file_name, offset + ofs_init + 1);
      ofs[19] = ofs_init;
      ofs_init += rows[i].row_info.file_name.length + 1;
    }

    if (isUTF16String(rows[i].row_info.track_file_path)) {
      page.writeUInt8(0x90, offset + ofs_init);
      page.writeUInt16LE(
        rows[i].row_info.track_file_path.length * 2 + 4,
        offset + ofs_init + 1
      );
      page.write(
        rows[i].row_info.track_file_path,
        offset + ofs_init + 4,
        "utf-16le"
      );
      ofs[20] = ofs_init;
      ofs_init += 4 + rows[i].row_info.track_file_path.length * 2;
    } else if (rows[i].row_info.track_file_path.length < 126) {
      page.writeUInt8(
        rows[i].row_info.track_file_path.length * 2 + 3,
        offset + ofs_init
      );
      page.write(rows[i].row_info.track_file_path, offset + ofs_init + 1);
      ofs[20] = ofs_init;
      ofs_init += rows[i].row_info.track_file_path.length + 1;
    } else {
      page.writeUInt8(64, offset + ofs_init + 2);
      page.writeUInt16LE(
        rows[i].row_info.track_file_path.length + 4,
        offset + ofs_init + 3
      );
      page.write(rows[i].row_info.track_file_path, offset + ofs_init + 6);
      ofs[20] = ofs_init + 2;
      ofs_init += rows[i].row_info.track_file_path.length + 6;
    }

    for (let j = 0; j <= 20; j++) {
      page.writeUInt16LE(ofs[j], offset + 94 + j * 2);
    }

    offset += ofs_init + 49;
    if (offset % 2 === 1) offset++; // this is only my prediction
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let k = 0; k < i; k++) {
    if (k % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(i - k, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[k], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, i);

  const page_data = Buffer.concat([header_data, page]);
  const extra_rows = rows.slice(i);
  return { page_data, extra_rows };
}

function writeAlbumPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  // Assumption values
  const u1 = 128;
  const unknown2 = 0;
  const unknown3 = 0;
  const u4 = 3;

  const row_ofs = [0];
  // const row_pf = [1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    // offset = row_ofs[i];
    page.writeUInt16LE(u1, offset);
    page.writeUInt16LE(rows[i].i_shift, offset + 2);
    page.writeUInt32LE(unknown2, offset + 4);
    page.writeUInt32LE(rows[i].artist_id, offset + 8);
    page.writeUInt32LE(rows[i].id, offset + 12);
    page.writeUInt32LE(unknown3, offset + 16);
    page.writeUInt8(u4, offset + 20);
    page.writeUInt8(rows[i].on, offset + 21);
    page.writeUInt8(rows[i].album_name.length * 2 + 3, offset + rows[i].on);
    page.write(rows[i].album_name, offset + rows[i].on + 1);

    offset += 22 + rows[i].album_name.length + 10;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeArtistPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  // Assumption values
  const u1 = 3;

  const row_ofs = [0];
  // const row_pf = [1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    // offset = row_ofs[i];
    page.writeUInt16LE(rows[i].type, offset);
    page.writeUInt16LE(rows[i].i_shift, offset + 2);
    page.writeUInt32LE(rows[i].id, offset + 4);
    page.writeUInt8(u1, offset + 8);
    page.writeUInt8(rows[i].on, offset + 9);
    if (rows[i].type === 100) {
      page.writeUInt16LE(rows[i].ofar, offset + 10);
      page.writeUInt8(
        rows[i].artist_name.length * 2 + 3,
        offset + rows[i].ofar
      );
      page.write(rows[i].artist_name, offset + rows[i].ofar + 1);
      offset += rows[i].ofar + rows[i].artist_name.length + 10;
    } else {
      page.writeUInt8(rows[i].artist_name.length * 2 + 3, offset + rows[i].on);
      page.write(rows[i].artist_name, offset + rows[i].on + 1);
      offset += rows[i].on + rows[i].artist_name.length + 1 + 8;
    }
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeArtworkPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [0];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    page.writeUInt32LE(rows[i].id, offset);
    page.writeUInt8(rows[i].path.length * 2 + 3, offset + 4);
    page.write(rows[i].path, offset + 4 + 1);
    offset += 4 + rows[i].path.length + 3;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeColorPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  // Assumption values
  const unknown1 = 0;
  const u3 = 0;

  const row_ofs = [0, 16, 28, 44, 60, 76, 92, 108]; // [0];
  // const row_pf = [255];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt32LE(unknown1, offset);
    page.writeUInt8(rows[i].u2, offset + 4);
    page.writeUInt16LE(rows[i].id, offset + 5);
    page.writeUInt8(u3, offset + 7);
    page.writeUInt8(rows[i].color_name.length * 2 + 3, offset + 8);
    page.write(rows[i].color_name, offset + 8 + 1);
    offset += 8 + rows[i].color_name.length + 4;
    // row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeColumnPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  // Assumption values
  const unknown1 = 144;
  const u2 = 0;
  const u3 = 65530;

  const row_ofs = [0];
  // const row_pf = [65535, 2047];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    // offset = row_ofs[i];
    page.writeUInt16LE(rows[i].id, offset);
    page.writeUInt16LE(rows[i].number, offset + 2);
    page.writeUInt8(unknown1, offset + 4);
    page.writeUInt8(rows[i].len, offset + 5);
    page.writeUInt16LE(u2, offset + 6);
    page.writeUInt16LE(u3, offset + 8);
    page.write(rows[i].column_name, offset + 10, "utf-16le");
    offset += 10 + rows[i].column_name.length * 2;
    page.writeUInt16LE(rows[i].u4, offset);
    page.writeUInt16LE(rows[i].u5, offset + 2);
    offset += 4;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeGenrePage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [0];
  // const row_pf = [1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    // offset = row_ofs[i];
    page.writeUInt32LE(rows[i].id, offset);
    page.writeUInt8(rows[i].genre_name.length * 2 + 3, offset + 4);
    page.write(rows[i].genre_name, offset + 5);
    offset += 4 + rows[i].genre_name.length + 3;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeHistoryPlaylistPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136,
    144, 152, 160, 168,
  ];
  const row_pf = [65535, 63];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt16LE(rows[i].u1, offset);
    page.writeUInt16LE(rows[i].u2, offset + 2);
    page.writeUInt8(rows[i].u3, offset + 4);
    page.writeUInt8(rows[i].u4, offset + 5);
    page.writeUInt16LE(rows[i].u5, offset + 6);
    offset += 8;
    // row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      // const row_pf = Math.pow(2, Math.min(16, rows.length - i)) - 1;
      page.writeUInt16LE(row_pf[i / 16], ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeHistoryEntryPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128,
  ];
  const row_pf = [65535, 1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt16LE(rows[i].track_id, offset);
    page.writeUInt16LE(rows[i].playlist_id, offset + 2);
    page.writeUInt32LE(rows[i].entry_index, offset + 4);
    offset += 8;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      // const row_pf = Math.pow(2, Math.min(16, rows.length - i)) - 1;
      page.writeUInt16LE(row_pf[i / 16], ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeHistoryPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [0]; // [0];
  const row_pf = [1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt8(rows[i].unknown1, offset);
    page.writeUInt8(rows[i].u2, offset + 1);
    page.writeUInt8(rows[i].u3, offset + 2);
    page.writeUInt16LE(rows[i].u4, offset + 3);
    page.writeUInt32LE(rows[i].u5, offset + 5);
    page.writeUInt16LE(rows[i].u6, offset + 9);
    page.writeUInt8(rows[i].u7, offset + 11);
    page.writeUInt8(rows[i].date.length * 2 + 3, offset + 12);
    page.write(rows[i].date, offset + 13);
    offset += 13 + rows[i].date.length;
    page.writeUInt8(rows[i].u8, offset);
    page.writeUInt8(rows[i].u9, offset + 1);
    page.writeUInt8(rows[i].num.length * 2 + 3, offset + 2);
    page.write(rows[i].num, offset + 3);
    offset += 3 + rows[i].num.length;
    page.writeUInt16LE(rows[i].u10, offset);
    offset += 2 + 8;
    // row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      // const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf[i / 16], ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);
}

function writeKeyPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [0]; //, 12];
  // const row_pf = [3];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    // offset = row_ofs[i];
    page.writeUInt32LE(rows[i].id, offset);
    page.writeUInt32LE(rows[i].id2, offset + 4);
    page.writeUInt8(rows[i].key_name.length * 2 + 3, offset + 8);
    page.write(rows[i].key_name, offset + 8 + 1);
    offset += 8 + 1 + rows[i].key_name.length + 2;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);

  // return page;
}

function writePlaylistTreePage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  // Assumption values
  const unknown = 0;

  const row_ofs = [0];
  // const row_pf = [1];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt32LE(rows[i].parent_id, offset);
    page.writeUInt32LE(unknown, offset + 4);
    page.writeUInt32LE(rows[i].sort_order, offset + 8);
    page.writeUInt32LE(rows[i].id, offset + 12);
    page.writeUInt32LE(rows[i].raw_is_folder, offset + 16);
    page.writeUInt8(rows[i].name.length * 2 + 3, offset + 20);
    page.write(rows[i].name, offset + 20 + 1);
    offset += 20 + rows[i].name.length + 2;
    if (offset % 2 === 1) offset++;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);

  // return page;
}

function writePlaylistEntryPage(header, rows, len_page) {
  const len_page_header = 40;
  const page = Buffer.alloc(len_page - len_page_header);

  const row_ofs = [0]; //, 12];
  // const row_pf = [3];
  var offset = 0;

  for (let i = 0; i < rows.length; i++) {
    offset = row_ofs[i];
    page.writeUInt32LE(rows[i].entry_index, offset);
    page.writeUInt32LE(rows[i].track_id, offset + 4);
    page.writeUInt32LE(rows[i].playlist_id, offset + 8);
    offset += 12;
    row_ofs.push(offset);
  }

  var ofs_index = len_page - len_page_header;
  for (let i = 0; i < rows.length; i++) {
    if (i % 16 === 0) {
      ofs_index -= 4;
      page.writeUInt16LE(0, ofs_index + 2);
      const row_pf = Math.pow(2, Math.min(rows.length - i, 16)) - 1;
      page.writeUInt16LE(row_pf, ofs_index);
    }
    ofs_index -= 2;
    page.writeUInt16LE(row_ofs[i], ofs_index);
  }

  const header_data = writeTableHeader(header, offset, len_page, rows.length);

  return Buffer.concat([header_data, page]);

  // return page;
}

function writeEmptyPage(len_page) {
  return Buffer.alloc(len_page);
}

function writeUnknownPage(header, len_page) {
  console.log("***Unknown page has written***");
  // const page_header_len = 40;
  const header_data = writeTablePageHeader(header, len_page);

  return Buffer.concat([header_data, page]);
}

function writeNonDataPage(header, index, len_page) {
  const page_index = header[index].page_index;
  const next_page = header[index + 1].page_index;

  const unknown = 67108863;

  const u1 = 536805376;
  const u2 = 536870904;

  const len_page_header = 40;
  const non_data_page = Buffer.alloc(len_page - len_page_header);

  non_data_page.writeUInt32LE(page_index, 0);
  non_data_page.writeUInt32LE(unknown, 8);

  if (page_index !== next_page - 1 || index === header.length - 1) {
    non_data_page.writeUInt32LE(unknown, 4);
  } else {
    non_data_page.writeUInt32LE(next_page, 4);
  }
  non_data_page.writeUInt32LE(u1, 16);

  for (let ofs = 20; ofs < len_page - len_page_header - 20; ofs += 4) {
    non_data_page.writeUInt32LE(u2, ofs);
  }

  const cur_header = header[index];

  const header_data = writeTablePageHeader(cur_header, len_page);

  return Buffer.concat([header_data, non_data_page]);

  // return non_data_page;
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

const len_page = 4096;

const file_header = {
  len_page: 4096,
  num_tables: 20,
  next_u: 54,
  unknown: 5,
  sequence: 61,
};

const pointer = [
  { type: 0, empty_c: 49, first_page: 1, last_page: 2 },
  { type: 1, empty_c: 52, first_page: 3, last_page: 4 },
  { type: 2, empty_c: 47, first_page: 5, last_page: 6 },
  { type: 3, empty_c: 51, first_page: 7, last_page: 8 },
  { type: 4, empty_c: 10, first_page: 9, last_page: 9 },
  { type: 5, empty_c: 48, first_page: 11, last_page: 12 },
  { type: 6, empty_c: 42, first_page: 13, last_page: 14 },
  { type: 7, empty_c: 46, first_page: 15, last_page: 16 },
  { type: 8, empty_c: 50, first_page: 17, last_page: 18 },
  { type: 9, empty_c: 20, first_page: 19, last_page: 19 },
  { type: 10, empty_c: 22, first_page: 21, last_page: 21 },
  { type: 11, empty_c: 24, first_page: 23, last_page: 23 },
  { type: 12, empty_c: 26, first_page: 25, last_page: 25 },
  { type: 13, empty_c: 53, first_page: 27, last_page: 28 },
  { type: 14, empty_c: 30, first_page: 29, last_page: 29 },
  { type: 15, empty_c: 32, first_page: 31, last_page: 31 },
  { type: 16, empty_c: 43, first_page: 33, last_page: 34 },
  { type: 17, empty_c: 44, first_page: 35, last_page: 36 },
  { type: 18, empty_c: 45, first_page: 37, last_page: 38 },
  { type: 19, empty_c: 41, first_page: 39, last_page: 40 },
];

/// ----- Page Headers Data -----
const page_headers = [
  {
    page_index: 1,
    type: 0,
    next_page: 2,
    unknown1: 57,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 1,
    num_rl: 0,
    u6: 1004,
    u7: 1,
  },
  {
    page_index: 2,
    type: 0,
    next_page: 49,
    unknown1: 57,
    unknown2: 0,
    nrs: 11,
    u3: 64,
    u4: 1,
    pf: 52,
    free_s: 10,
    used_s: 4020,
    u5: 1,
    num_rl: 7,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 3,
    type: 1,
    next_page: 4,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 4,
    type: 1,
    next_page: 52,
    unknown1: 35,
    unknown2: 0,
    nrs: 2,
    u3: 64,
    u4: 0,
    pf: 36,
    free_s: 4012,
    used_s: 36,
    u5: 1,
    num_rl: 1,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 5,
    type: 2,
    next_page: 6,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 6,
    type: 2,
    next_page: 47,
    unknown1: 45,
    unknown2: 0,
    nrs: 7,
    u3: 224,
    u4: 0,
    pf: 36,
    free_s: 3818,
    used_s: 220,
    u5: 1,
    num_rl: 6,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 7,
    type: 3,
    next_page: 8,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 8,
    type: 3,
    next_page: 51,
    unknown1: 36,
    unknown2: 0,
    nrs: 3,
    u3: 96,
    u4: 0,
    pf: 36,
    free_s: 3902,
    used_s: 144,
    u5: 1,
    num_rl: 2,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 9,
    type: 4,
    next_page: 10,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 11,
    type: 5,
    next_page: 12,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 12,
    type: 5,
    next_page: 48,
    unknown1: 54,
    unknown2: 0,
    nrs: 10,
    u3: 64,
    u4: 1,
    pf: 36,
    free_s: 3912,
    used_s: 120,
    u5: 1,
    num_rl: 9,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 13,
    type: 6,
    next_page: 14,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 14,
    type: 6,
    next_page: 42,
    unknown1: 2,
    unknown2: 0,
    nrs: 8,
    u3: 0,
    u4: 1,
    pf: 36,
    free_s: 3912,
    used_s: 124,
    u5: 8,
    num_rl: 0,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 15,
    type: 7,
    next_page: 16,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 16,
    type: 7,
    next_page: 46,
    unknown1: 6,
    unknown2: 0,
    nrs: 1,
    u3: 32,
    u4: 0,
    pf: 36,
    free_s: 4018,
    used_s: 32,
    u5: 1,
    num_rl: 0,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 17,
    type: 8,
    next_page: 18,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 18,
    type: 8,
    next_page: 50,
    unknown1: 58,
    unknown2: 0,
    nrs: 12,
    u3: 128,
    u4: 1,
    pf: 36,
    free_s: 3884,
    used_s: 144,
    u5: 1,
    num_rl: 11,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 19,
    type: 9,
    next_page: 20,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 21,
    type: 10,
    next_page: 22,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 23,
    type: 11,
    next_page: 24,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 25,
    type: 12,
    next_page: 26,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 27,
    type: 13,
    next_page: 28,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 28,
    type: 13,
    next_page: 53,
    unknown1: 56,
    unknown2: 0,
    nrs: 3,
    u3: 96,
    u4: 0,
    pf: 36,
    free_s: 3938,
    used_s: 108,
    u5: 1,
    num_rl: 2,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 29,
    type: 14,
    next_page: 30,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 31,
    type: 15,
    next_page: 32,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 33,
    type: 16,
    next_page: 34,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 34,
    type: 16,
    next_page: 43,
    unknown1: 3,
    unknown2: 0,
    nrs: 27,
    u3: 96,
    u4: 3,
    pf: 36,
    free_s: 3270,
    used_s: 724,
    u5: 27,
    num_rl: 0,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 35,
    type: 17,
    next_page: 36,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 36,
    type: 17,
    next_page: 44,
    unknown1: 4,
    unknown2: 0,
    nrs: 22,
    u3: 192,
    u4: 2,
    pf: 36,
    free_s: 3828,
    used_s: 176,
    u5: 22,
    num_rl: 0,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 37,
    type: 18,
    next_page: 38,
    unknown1: 1,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 0,
  },
  {
    page_index: 38,
    type: 18,
    next_page: 45,
    unknown1: 5,
    unknown2: 0,
    nrs: 17,
    u3: 32,
    u4: 2,
    pf: 36,
    free_s: 3878,
    used_s: 136,
    u5: 17,
    num_rl: 0,
    u6: 0,
    u7: 0,
  },
  {
    page_index: 39,
    type: 19,
    next_page: 40,
    unknown1: 13,
    unknown2: 0,
    nrs: 0,
    u3: 0,
    u4: 0,
    pf: 100,
    free_s: 0,
    used_s: 0,
    u5: 8191,
    num_rl: 8191,
    u6: 1004,
    u7: 1,
  },
  {
    page_index: 40,
    type: 19,
    next_page: 41,
    unknown1: 55,
    unknown2: 0,
    nrs: 13,
    u3: 32,
    u4: 0,
    pf: 52,
    free_s: 3506,
    used_s: 520,
    u5: 2,
    num_rl: 11,
    u6: 0,
    u7: 0,
  },
];

const color_rows = [
  { unknown1: 0, u2: 1, id: 1, u3: 0, color_name: "Pink" },
  { unknown1: 0, u2: 2, id: 2, u3: 0, color_name: "Red" },
  { unknown1: 0, u2: 3, id: 3, u3: 0, color_name: "Orange" },
  { unknown1: 0, u2: 4, id: 4, u3: 0, color_name: "Yellow" },
  { unknown1: 0, u2: 5, id: 5, u3: 0, color_name: "Green" },
  { unknown1: 0, u2: 6, id: 6, u3: 0, color_name: "Aqua" },
  { unknown1: 0, u2: 7, id: 7, u3: 0, color_name: "Blue" },
  { unknown1: 0, u2: 8, id: 8, u3: 0, color_name: "Purple" },
];

const column_rows = [
  {
    id: 1,
    number: 128,
    unknown1: 144,
    len: 18,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "GENRE￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 2,
    number: 129,
    unknown1: 144,
    len: 20,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "ARTIST",
    u4: 84,
    u5: 65531,
  },
  {
    id: 3,
    number: 130,
    unknown1: 144,
    len: 18,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "ALBUM￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 4,
    number: 131,
    unknown1: 144,
    len: 18,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "TRACK￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 5,
    number: 133,
    unknown1: 144,
    len: 14,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "BPM￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 6,
    number: 134,
    unknown1: 144,
    len: 20,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "RATING",
    u4: 71,
    u5: 65531,
  },
  {
    id: 7,
    number: 135,
    unknown1: 144,
    len: 16,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "YEAR",
    u4: 82,
    u5: 65531,
  },
  {
    id: 8,
    number: 136,
    unknown1: 144,
    len: 22,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "REMIXER￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 9,
    number: 137,
    unknown1: 144,
    len: 18,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "LABEL￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 10,
    number: 138,
    unknown1: 144,
    len: 38,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "ORIGINAL ARTIST￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 11,
    number: 139,
    unknown1: 144,
    len: 14,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "KEY￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 12,
    number: 141,
    unknown1: 144,
    len: 14,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "CUE￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 13,
    number: 142,
    unknown1: 144,
    len: 18,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "COLOR￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 14,
    number: 146,
    unknown1: 144,
    len: 16,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "TIME",
    u4: 69,
    u5: 65531,
  },
  {
    id: 15,
    number: 147,
    unknown1: 144,
    len: 22,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "BITRATE￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 16,
    number: 148,
    unknown1: 144,
    len: 26,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "FILE NAME￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 17,
    number: 132,
    unknown1: 144,
    len: 24,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "PLAYLIST",
    u4: 84,
    u5: 65531,
  },
  {
    id: 18,
    number: 152,
    unknown1: 144,
    len: 32,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "HOT CUE BANK",
    u4: 75,
    u5: 65531,
  },
  {
    id: 19,
    number: 149,
    unknown1: 144,
    len: 22,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "HISTORY￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 20,
    number: 145,
    unknown1: 144,
    len: 20,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "SEARCH",
    u4: 72,
    u5: 65531,
  },
  {
    id: 21,
    number: 150,
    unknown1: 144,
    len: 24,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "COMMENTS",
    u4: 83,
    u5: 65531,
  },
  {
    id: 22,
    number: 140,
    unknown1: 144,
    len: 28,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "DATE ADDED",
    u4: 68,
    u5: 65531,
  },
  {
    id: 23,
    number: 151,
    unknown1: 144,
    len: 34,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "DJ PLAY COUNT￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 24,
    number: 144,
    unknown1: 144,
    len: 20,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "FOLDER",
    u4: 82,
    u5: 65531,
  },
  {
    id: 25,
    number: 161,
    unknown1: 144,
    len: 22,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "DEFAULT￻",
    u4: 65531,
    u5: 0,
  },
  {
    id: 26,
    number: 162,
    unknown1: 144,
    len: 24,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "ALPHABET",
    u4: 84,
    u5: 65531,
  },
  {
    id: 27,
    number: 170,
    unknown1: 144,
    len: 24,
    u2: 0,
    u3: 250,
    u33: 255,
    column_name: "MATCHING",
    u4: 71,
    u5: 65531,
  },
];
const history_playlist_rows = [
  { u1: 15, u2: 20, u3: 6, u4: 1, u5: 0 },
  { u1: 16, u2: 21, u3: 99, u4: 1, u5: 0 },
  { u1: 18, u2: 23, u3: 99, u4: 1, u5: 0 },
  { u1: 8, u2: 9, u3: 99, u4: 1, u5: 0 },
  { u1: 9, u2: 10, u3: 99, u4: 1, u5: 0 },
  { u1: 10, u2: 11, u3: 99, u4: 1, u5: 0 },
  { u1: 13, u2: 15, u3: 99, u4: 1, u5: 0 },
  { u1: 14, u2: 19, u3: 4, u4: 1, u5: 0 },
  { u1: 1, u2: 1, u3: 99, u4: 1, u5: 0 },
  { u1: 5, u2: 6, u3: 5, u4: 1, u5: 0 },
  { u1: 6, u2: 7, u3: 99, u4: 1, u5: 0 },
  { u1: 7, u2: 8, u3: 99, u4: 1, u5: 0 },
  { u1: 2, u2: 2, u3: 2, u4: 0, u5: 1 },
  { u1: 3, u2: 3, u3: 3, u4: 0, u5: 2 },
  { u1: 4, u2: 4, u3: 1, u4: 0, u5: 3 },
  { u1: 11, u2: 12, u3: 99, u4: 0, u5: 4 },
  { u1: 17, u2: 5, u3: 99, u4: 0, u5: 5 },
  { u1: 19, u2: 22, u3: 99, u4: 0, u5: 6 },
  { u1: 20, u2: 18, u3: 99, u4: 0, u5: 7 },
  { u1: 27, u2: 26, u3: 99, u4: 2, u5: 8 },
  { u1: 24, u2: 17, u3: 99, u4: 0, u5: 9 },
  { u1: 22, u2: 27, u3: 99, u4: 5, u5: 10 },
];
const history_entry_rows = [
  { track_id: 22, playlist_id: 17, entry_index: 1 },
  { track_id: 14, playlist_id: 8, entry_index: 1 },
  { track_id: 8, playlist_id: 9, entry_index: 1 },
  { track_id: 9, playlist_id: 10, entry_index: 1 },
  { track_id: 10, playlist_id: 11, entry_index: 1 },
  { track_id: 15, playlist_id: 13, entry_index: 1 },
  { track_id: 13, playlist_id: 15, entry_index: 1 },
  { track_id: 23, playlist_id: 16, entry_index: 1 },
  { track_id: 1, playlist_id: 6, entry_index: 1 },
  { track_id: 21, playlist_id: 7, entry_index: 1 },
  { track_id: 25, playlist_id: 0, entry_index: 256 },
  { track_id: 26, playlist_id: 1, entry_index: 512 },
  { track_id: 2, playlist_id: 2, entry_index: 768 },
  { track_id: 3, playlist_id: 3, entry_index: 1024 },
  { track_id: 5, playlist_id: 4, entry_index: 1280 },
  { track_id: 6, playlist_id: 5, entry_index: 1536 },
  { track_id: 11, playlist_id: 12, entry_index: 1792 },
];
const history_rows = [
  {
    unknown1: 128,
    u2: 2,
    u3: 128,
    u4: 3073,
    u5: 0,
    u6: 0,
    u7: 0,
    date: "2023-12-19",
    u8: 25,
    u9: 30,
    num: "1000",
    u10: 3,
  },
];

function writePDBFromParsedData(parsed_data, usb_drive) {
  console.log("----- Write PDB file -----");
  var pdb_file;

  const collection = parsed_data.DJ_PLAYLISTS.COLLECTION[0];

  const entries = Number(collection.$.Entries); // number of track in collection

  // Row data
  const track_data = [];
  const genre_data = [];
  const artist_data = [];
  const album_data = [];
  const artwork_data = [];
  const label_data = [];
  const key_data = [];
  const playlist_tree_data = [];
  const playlist_entry_data = [];

  // Assumption values
  const u1 = 36;
  const bitmask = 788224;
  const u3 = 44617;
  const u4 = 57100;
  const orig_artist_id = 0;
  const s_depth = 16;
  const u5 = 41;
  const c_id = 0;
  const u6 = 1;
  const u7 = 3;
  const isrc = "";
  const texter = "";
  const unknown_string_2 = "2";
  const unknown_string_3 = "2";
  const unknown_string_4 = "";
  const message = "";
  const kuvo_public = "ON";
  const autoload_hotcues = "ON";
  const unknown_string_5 = "";
  const unknown_string_6 = "";
  const release_date = "";
  const unknown_string_7 = "";
  const unknown_string_8 = "";

  // Some help variables
  var composer_num = 0;
  var artist_num = 0;
  var key_num = 0;
  var laebl_num = 0;
  var remixer_num = 0;
  var genre_num = 0;
  var album_num = 0;
  var artwork_num = 0;
  var anlz_path_array = [];
  var anlz_path_subarray = [];

  for (let i = 0; i < collection.TRACK.length; /*entries;*/ i++) {
    const cur_track = collection.TRACK[i];

    const track_id = Number(cur_track.$.TrackID);
    const title = cur_track.$.Name;
    const artist = getValidString(cur_track.$.Artist); // artist data
    var artist_id = 0;
    if (artist !== "") {
      const art_i = artist_data.findIndex((e) => e.artist_name === artist);
      if (art_i !== -1) {
        artist_id = artist_data[art_i].id;
      } else {
        artist_id = artist_num + 1;
        artist_data.push({
          type: 96,
          i_shift: artist_num * 32,
          id: artist_id,
          u1: 3,
          on: 10,
          artist_name: artist,
        });
        artist_num++;
      }
    }
    const composer = getValidString(cur_track.$.Composer); // composer data
    var composer_id = 0;
    if (composer !== "") {
      composer_id = composer_num + 1;
      composer_num++;
    }
    const album = getValidString(cur_track.$.Album); // albums data
    var album_id = 0;
    if (album !== "") {
      const album_i = album_data.findIndex((e) => e.album_name === album);
      if (album_i !== -1) {
        album_id = album_data[album_i].id;
      } else {
        album_id = album_num + 1;
        const artist_index = track_data.findIndex(
          (e) => e.album_id === album_id
        );
        const artist_id =
          artist_index === -1 ? 0 : track_data[artist_index].artist_id;

        album_data.push({
          u1: 128,
          i_shift: album_num * 32,
          unknown2: 0,
          artist_id,
          id: album_id,
          unknown3: 0,
          u4: 3,
          on: 22,
          album_name: album,
        });
        album_num++;
      }
    }
    const genre = getValidString(cur_track.$.Genre); // genres data
    var genre_id = 0;
    if (genre !== "") {
      const genre_i = genre_data.findIndex((e) => e.genre_name === genre);
      if (genre_i !== -1) {
        genre_id = genre_data[genre_i].id;
      } else {
        genre_id = genre_num + 1;
        genre_data.push({
          id: genre_id,
          genre_name: genre,
        });
        genre_num++;
      }
    }
    // track row
    const file_size = getValidNumber(cur_track.$.Size);
    const disc_n = getValidNumber(cur_track.$.DiscNumber);
    const track_number = getValidNumber(cur_track.$.TrackNumber);
    const year = getValidNumber(cur_track.$.Year);
    const tempo = getValidNumber(cur_track.$.AverageBpm) * 100;
    const date_added = getValidString(cur_track.$.DateAdded);
    const bitrate = getValidNumber(cur_track.$.BitRate);
    const sample_rate = getValidNumber(cur_track.$.SampleRate);
    const comment = getValidString(cur_track.$.Comments);
    const play_c = getValidNumber(cur_track.$.PlayCount);
    const dur = getValidNumber(cur_track.$.TotalTime);
    const r = getValidNumber(cur_track.$.Rating);
    const label_name = getValidString(cur_track.$.Label); // labels data
    var label_id = 0;
    if (label_name !== "") {
      const label_i = label_data.findIndex((e) => e.genre_name === label_name);
      if (label_i !== -1) {
        label_id = label_data[label_i].id;
      } else {
        label_id = laebl_num + 1;
        label_data.push({
          id: label_id,
          genre_name: label_name,
        });
        laebl_num++;
      }
    }
    const remixer_name = getValidString(cur_track.$.Remixer);
    var remixer_id = 0;
    if (remixer_name !== "") {
      remixer_id = remixer_num + 1;
      remixer_num++;
    }
    const mix_name = getValidString(cur_track.$.Mix);
    const key_name = getValidString(cur_track.$.Tonality); // keys data
    var key_id = 0;
    if (key_name !== "") {
      const key_i = key_data.findIndex((e) => e.key_name === key_name);
      if (key_i !== -1) {
        key_id = key_data[key_i].id;
      } else {
        key_id = key_num + 1;
        key_data.push({
          id: key_id,
          id2: key_id,
          key_name,
        });
        key_num++;
      }
    }

    // track path and name
    var location = cur_track.$.Location.slice(17);
    if (platform === "darwin") {
      location = "/" + location;
    }
    const path = decodeURIComponent(location);
    const name_index = path.lastIndexOf("/");
    var file_name = path.slice(name_index + 1);
    if (file_name.length > 70) {
      file_name = file_name.slice(0, 44);
      const ext_i = path.lastIndexOf(".");
      file_name += path.slice(ext_i);
      for (let m = 0; m < 9; m++) {
        const fn_i = track_data.findIndex(
          (element) => element.row_info.file_name === file_name
        );
        if (fn_i === -1) break;
        file_name =
          file_name.slice(0, file_name.lastIndexOf(".") - 2) +
          "-" +
          m.toString() +
          path.slice(ext_i);
      }
    }

    // artwork data
    var artwork_id = 0;
    const artwork_path =
      usb_drive +
      "/PIONEER/Artwork/00001/a" +
      (artwork_num + 1).toString(10) +
      ".jpg";
    const is_artwork = extractArtwork(path, artwork_path);
    if (is_artwork) {
      artwork_id = artwork_num + 1;
      artwork_data.push({
        id: artwork_id,
        path: artwork_path,
      });
      artwork_num++;
    }

    var artist_path =
      artist === "" || artist === undefined ? "UnknownArtist" : artist;
    var album_path =
      album === "" || album === undefined ? "UnknownAlbum" : album;
    const file_path =
      "/Contents/" +
      makeValidFilePath(artist_path) +
      "/" +
      makeValidFilePath(album_path) +
      "/" +
      file_name;

    copyFile(path, usb_drive + file_path);

    // Generate the anlz path
    var root_path = Math.floor(Math.random() * 1024);
    while (anlz_path_array.indexOf(root_path) !== -1) {
      root_path = Math.floor(Math.random() * 1024);
    }
    anlz_path_array.push(root_path);
    var anlz_path = "/PIONEER/USBANLZ/P" + intToHex(root_path, 3) + "/";

    var sub_path = Math.floor(Math.random() * 65536);
    while (anlz_path_subarray.indexOf(sub_path) !== -1) {
      sub_path = Math.floor(Math.random() * 65536);
    }
    anlz_path_subarray.push(sub_path);
    anlz_path += intToHex(sub_path, 8) + "/ANLZ0000.DAT";

    console.log(anlz_path);

    track_data.push({
      u1,
      i_shift: i * 32,
      bitmask,
      sample_rate,
      composer_id,
      file_size,
      unknown2: track_id,
      u3,
      u4,
      artwork_id,
      key_id,
      orig_artist_id,
      label_id,
      remixer_id,
      bitrate,
      track_number,
      tempo,
      genre_id,
      album_id,
      artist_id,
      id: i + 1,
      disc_n,
      play_c,
      year,
      s_depth,
      dur,
      u5,
      c_id,
      r,
      u6,
      u7,
      row_info: {
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
        anlz_date: getTodayDate(),
        comment,
        title,
        unknown_string_8,
        file_name,
        track_file_path: file_path,
      },
    });
  }

  // playlist tree and entries
  const node_cnt = Number(
    parsed_data.DJ_PLAYLISTS.PLAYLISTS[0].NODE[0].$.Count
  );
  var playlist_num = 0;
  for (let i = 0; i < node_cnt; i++) {
    var playlist_entry_num = 0;
    // Playlist tree rows
    const playlist = parsed_data.DJ_PLAYLISTS.PLAYLISTS[0].NODE[0].NODE[i];
    if (playlist.$.Name === "Trial playlist - Cloud Library Sync") continue;
    const playlist_id = playlist_num + 1;
    playlist_tree_data.push({
      parent_id: 0,
      unknown: 0,
      sort_order: 0,
      id: playlist_id,
      raw_is_folder: 0,
      name: playlist.$.Name,
    });
    playlist_num++;

    // Playlist entry rows
    const playlist_entry_cnt = Number(playlist.$.Entries);
    for (let j = 0; j < playlist_entry_cnt; j++) {
      const track_key = Number(playlist.TRACK[j].$.Key);
      const playlist_track = track_data.findIndex(
        (element) => element.unknown2 === track_key
      );
      var track_id = playlist_track === -1 ? 0 : track_data[playlist_track].id;
      const entry_index = playlist_entry_num + 1;
      playlist_entry_num++;
      playlist_entry_data.push({
        entry_index,
        track_id,
        playlist_id,
      });
    }
  }
  // Write PDB file
  const page_data = [
    track_data,
    genre_data,
    artist_data,
    album_data,
    label_data,
    key_data,
    color_rows,
    playlist_tree_data,
    playlist_entry_data,
    // 4 unknowns
    [],
    [],
    [],
    [],
    artwork_data,
    // 2 unknowns
    [],
    [],
    column_rows,
    history_playlist_rows,
    history_entry_rows,
    history_rows,
  ];

  console.log("----- page data -----");
  // console.log(
  //   track_data,
  //   genre_data,
  //   artist_data,
  //   album_data,
  //   key_data,
  //   playlist_tree_data,
  //   playlist_entry_data
  // );

  pdb_file = writePDBData(
    file_header,
    pointer,
    page_headers,
    page_data,
    len_page
  );
  const output_path = usb_drive + "/PIONEER/rekordbox/export.pdb";
  writeBufferToFile(pdb_file, output_path);
  return track_data;
}

module.exports = { writePDBHeader, writePDBData, writePDBFromParsedData };
