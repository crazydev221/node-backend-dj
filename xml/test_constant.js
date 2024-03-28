/// ----- Page Rows Data -----
const track_rows = [
  {
    u1: 36,
    i_shift: 0,
    bitmask: 788224,
    sample_rate: 44100,
    composer_id: 0,
    file_size: 7572292,
    unknown2: 204901376,
    u3: 44617,
    u4: 57100,
    artword_id: 0,
    key_id: 1,
    orig_artist_id: 0,
    label_id: 0,
    remixer_id: 0,
    bitrate: 320,
    track_number: 0,
    tempo: 15332,
    genre_id: 1,
    album_id: 1,
    artist_id: 1,
    id: 1,
    disc_n: 0,
    play_c: 0,
    year: 2011,
    s_depth: 16,
    dur: 189,
    u5: 41,
    c_id: 0,
    r: 0,
    u6: 1,
    u7: 3,
    row_info: {
      isrc: "",
      texter: "",
      unknown_string_2: "2",
      unknown_string_3: "2",
      unknown_string_4: "",
      message: "",
      kuvo_public: "ON",
      autoload_hotcues: "ON",
      unknown_string_5: "",
      unknown_string_6: "",
      date_added: "2023-12-14",
      release_date: "",
      mix_name: "",
      unknown_string_7: "",
      anlz_path: "/PIONEER/USBANLZ/P034/0000AA60/ANLZ0000.DAT",
      anlz_date: "2023-12-14",
      comment: "",
      title: "Amazing Grace 2011",
      unknown_string_8: "",
      file_name: "2.mp3",
      track_file_path: "/Contents/Kevin MacLeod/Royalty Free/2.mp3",
    },
  },
];
const genre_rows = [{ id: 1, genre_name: "Classical" }];
const artist_rows = [
  {
    type: 96,
    i_shift: 0,
    id: 1,
    u1: 3,
    on: 10,
    artist_name: "Kevin MacLeod",
  },
];
const album_rows = [
  {
    u1: 128,
    i_shift: 0,
    unknown2: 0,
    artist_id: 0,
    id: 1,
    unknown3: 0,
    u4: 3,
    on: 22,
    album_name: "Royalty Free",
  },
];
const label_rows = [];
const key_rows = [
  { id: 1, id2: 1, key_name: "C" },
  { id: 2, id2: 2, key_name: "Ab" },
];

const playlist_tree_rows = [
  {
    parent_id: 0,
    unknown: 0,
    sort_order: 0,
    id: 1,
    raw_is_folder: 0,
    name: "myPlaylist",
  },
];
const playlist_entry_rows = [
  { entry_index: 1, track_id: 1, playlist_id: 1 },
  { entry_index: 2, track_id: 2, playlist_id: 1 },
];

const page_rows = [
  // [],
  track_rows,
  // [],
  genre_rows,
  // [],
  artist_rows,
  // [],
  album_rows,
  label_rows,
  // [],
  key_rows,
  // [],
  color_rows,
  // [],
  playlist_tree_rows,
  // [],
  playlist_entry_rows,
  // 4 unknowns
  [],
  [],
  [],
  [],
  artwork_rows,
  // 2 unknowns
  [],
  [],
  // [],
  column_rows,
  // [],
  history_playlist_rows,
  // [],
  history_entry_rows,
  // [],
  history_rows,
];

var pdb_file;

// ----- PDB Header -----
const pdb_header = writePDBHeader(file_header, pointer);

// ----- Table Page -----
const table_page = writeRowData(page_headers, page_rows, len_page);

// ----- Save PDB File -----
pdb_file = Buffer.concat([pdb_header, table_page]);
writeBufferToFile(pdb_file, "export.pdb");
