const { AnlzTag } = require("./Struct");

const logger = require("log4js").getLogger(__filename);

class BuildTagLengthError extends Error {
  constructor(struct, lenData) {
    super(
      `\`lenTag\` (${struct.len_tag}) of '${struct.type}' does not match the data-length (${lenData})!`
    );
    this.name = "BuildTagLengthError";
  }
}

class AbstractAnlzTag {
  constructor(tagData) {
    this.struct = null;
    if (tagData !== null) {
      this.parse(tagData);
    }
  }

  get content() {
    return this.struct.content;
  }

  _checkLenHeader() {
    if (this.LEN_HEADER !== this.struct.len_header) {
      logger.warning(
        "`lenHeader` (%s) of `%s` doesn't match the expected value %s",
        this.struct.len_header,
        this.struct.type,
        this.LEN_HEADER
      );
    }
  }

  _checkLenTag() {
    if (this.LEN_TAG !== this.struct.len_tag) {
      logger.warning(
        "`lenTag` (%s)  of `%s` doesn't match the expected value %s",
        this.struct.len_tag,
        this.struct.type,
        this.LEN_TAG
      );
    }
  }

  checkParse() {}

  parse(tagData) {
    this.struct = AnlzTag.parse(tagData);
    if (this.LEN_HEADER) {
      this._checkLenHeader();
    }
    if (this.LEN_TAG) {
      this._checkLenTag();
    }
    this.checkParse();
  }

  build() {
    const data = structs.AnlzTag.build(this.struct);
    const lenData = data.length;
    if (lenData !== this.struct.len_tag) {
      throw new BuildTagLengthError(this.struct, lenData);
    }
    return data;
  }

  get() {
    return this.struct.content;
  }

  set() {}

  updateLen() {}

  toString() {
    const lenHeader = this.struct.len_header;
    const lenTag = this.struct.len_tag;
    return `${this.constructor.name}(lenHeader=${lenHeader}, lenTag=${lenTag})`;
  }

  pformat() {
    return String(this.struct);
  }
}

function _parseWfPreview(tag) {
  const n = tag.entries.length;
  const wf = new Array(n);
  const col = new Array(n);

  for (let i = 0; i < n; i++) {
    const data = tag.entries[i];
    wf[i] = data & 0x1f;
    col[i] = data >> 5;
  }

  return [wf, col];
}

class PQTZAnlzTag extends AbstractAnlzTag {
  static type = "PQTZ";
  static name = "beat_grid";
  static LEN_HEADER = 24;

  get count() {
    return this.content.entries.length;
  }

  get beats() {
    return this.getBeats();
  }

  get bpms() {
    return this.getBpms();
  }

  get bpmsAverage() {
    if (this.content.entries.length) {
      return (
        this.getBpms().reduce((acc, bpm) => acc + bpm, 0) /
        this.content.entries.length
      );
    }
    return 0.0;
  }

  get bpmsUnique() {
    return Array.from(new Set(this.getBpms()));
  }

  get times() {
    return this.getTimes();
  }

  get() {
    const n = this.content.entries.length;
    const beats = new Array(n);
    const bpms = new Array(n);
    const times = new Array(n);

    for (let i = 0; i < n; i++) {
      const entry = this.content.entries[i];
      // const { beat, tempo, time } = entry.values();
      beats[i] = entry.beat;
      bpms[i] = entry.tempo / 100; // BPM is saved as 100 * BPM
      times[i] = entry.time / 1000; // Convert milliseconds to seconds
    }

    return [beats, bpms, times];
  }

  getBeats() {
    return this.content.entries.map((entry) => entry.beat);
  }

  getBpms() {
    return this.content.entries.map((entry) => entry.tempo / 100);
  }

  getTimes() {
    return this.content.entries.map((entry) => entry.time / 1000);
  }

  set(beats, bpms, times) {
    const n = this.content.entries.length;
    const nBeats = beats.length;
    const nBpms = bpms.length;
    const nTimes = times.length;

    if (nBpms !== nBeats) {
      throw new Error(
        `Number of bpms not equal to number of beats: ${nBpms} != ${nBeats}`
      );
    }

    if (nTimes !== nBeats) {
      throw new Error(
        `Number of times not equal to number of beats: ${nBpms} != ${nTimes}`
      );
    }

    if (nBeats !== n) {
      throw new Error(
        `Number of beats not equal to current content length: ${nBeats} != ${n}`
      );
    }

    for (let i = 0; i < n; i++) {
      const { beat, bpm, t } = this.content.entries[i].values();
      const data = { beat: beat, tempo: 100 * bpm, time: 1000 * t };
      this.content.entries[i].update(data);
    }
  }

  setBeats(beats) {
    const n = this.content.entries.length;
    const nNew = beats.length;

    if (nNew !== n) {
      throw new Error(
        `Number of beats not equal to current content length: ${nNew} != ${n}`
      );
    }

    for (let i = 0; i < n; i++) {
      this.content.entries[i].beat = beats[i];
    }
  }

  setBpms(bpms) {
    const n = this.content.entries.length;
    const nNew = bpms.length;

    if (nNew !== n) {
      throw new Error(
        `Number of bpms not equal to current content length: ${nNew} != ${n}`
      );
    }

    for (let i = 0; i < n; i++) {
      this.content.entries[i].tempo = bpms[i] * 100;
    }
  }

  setTimes(times) {
    const n = this.content.entries.length;
    const nNew = times.length;

    if (nNew !== n) {
      throw new Error(
        `Number of times not equal to current content length: ${nNew} != ${n}`
      );
    }

    for (let i = 0; i < n; i++) {
      this.content.entries[i].time = times[i] * 1000;
    }
  }

  checkParse() {
    const { content } = this.struct;
    if (content.entry_count !== content.entries.length) {
      throw new Error("Entry count does not match the number of entries.");
    }
  }

  updateLen() {
    this.struct.len_tag;
    this.struct.len_tag =
      this.struct.len_header + 8 * this.content.entries.length;
  }
}

class PQT2AnlzTag extends AbstractAnlzTag {
  static type = "PQT2";
  static name = "beat_grid2";
  static LEN_HEADER = 56;
  static count = 2;

  get beats() {
    return this.getBeats();
  }

  get bpms() {
    return this.getBpms();
  }

  get times() {
    return this.getTimes();
  }

  get beatGridCount() {
    return this.content.entryCount;
  }

  get bpmsUnique() {
    return Array.from(new Set(this.getBpms()));
  }

  checkParse() {
    const lenBeats = this.struct.content.entryCount;
    if (lenBeats) {
      const expected = this.struct.len_tag - this.struct.len_header;
      const actual = 2 * this.content.entries.length; // each entry consist of 2 bytes
      if (actual !== expected) {
        throw new Error(`${actual} != ${expected}`);
      }
    }
  }

  get() {
    const n = this.content.bpm.length;
    const beats = new Array(n);
    const bpms = new Array(n);
    const times = new Array(n);

    for (let i = 0; i < n; i++) {
      const entry = this.content.bpm[i].values();
      const { beat, bpm, time } = entry;
      beats[i] = beat;
      bpms[i] = bpm / 100; // BPM is saved as 100 * BPM
      times[i] = time / 1000; // Convert milliseconds to seconds
    }

    return [beats, bpms, times];
  }

  getBeats() {
    return this.content.bpm.map((entry) => entry.beat);
  }

  getBpms() {
    return this.content.bpm.map((entry) => entry.tempo / 100);
  }

  getTimes() {
    return this.content.bpm.map((entry) => entry.time / 1000);
  }

  getBeatGrid() {
    return this.content.entries.map((entry) => entry.beat);
  }

  setBeats(beats) {
    for (let i = 0; i < beats.length; i++) {
      this.content.bpm[i].beat = beats[i];
    }
  }

  setBpms(bpms) {
    for (let i = 0; i < bpms.length; i++) {
      this.content.bpm[i].tempo = bpms[i] * 100;
    }
  }

  setTimes(times) {
    for (let i = 0; i < times.length; i++) {
      this.content.bpm[i].time = times[i] * 1000;
    }
  }

  build() {
    let data = structs.AnlzTag.build(this.struct);
    if (this.struct.content.entryCount === 0) {
      data = data.slice(0, this.struct.len_tag);
    }

    const lenData = data.length;
    if (lenData !== this.struct.len_tag) {
      throw new BuildTagLengthError(this.struct, lenData);
    }

    return data;
  }
}

class PCOBAnlzTag extends AbstractAnlzTag {
  static type = "PCOB";
  static name = "cue_list";
  static LEN_HEADER = 24;
}

class PCO2AnlzTag extends AbstractAnlzTag {
  static type = "PCO2";
  static name = "cue_list2";
  static LEN_HEADER = 20;
}

class PPTHAnlzTag extends AbstractAnlzTag {
  static type = "PPTH";
  static name = "path";
  static LEN_HEADER = 16;

  get path() {
    return this.content.path;
  }

  get() {
    return this.content.path;
  }

  set(path) {
    path = path.replace("\\", "/");
    const lenPath = Buffer.from(path, "utf-16-be").length + 2;
    this.content.path = path;
    this.content.lenPath = lenPath;
  }

  updateLen() {
    this.struct.len_tag = this.struct.len_header + this.content.lenPath;
  }
}

class PVBRAnlzTag extends AbstractAnlzTag {
  static type = "PVBR";
  static name = "vbr";
  static LEN_HEADER = 16;
  static LEN_TAG = 1620;

  get() {
    return this.content.idx;
  }
}

class PSSIAnlzTag extends AbstractAnlzTag {
  static type = "PSSI";
  static name = "structure";
  static LEN_HEADER = 32;
}

class PWAVAnlzTag extends AbstractAnlzTag {
  static type = "PWAV";
  static name = "wf_preview";
  static LEN_HEADER = 20;

  get() {
    return _parseWfPreview(this.content);
  }
}

class PWV2AnlzTag extends AbstractAnlzTag {
  static type = "PWV2";
  static name = "wf_tiny_preview";
  static LEN_HEADER = 20;

  get() {
    return _parseWfPreview(this.content);
  }
}

class PWV3AnlzTag extends AbstractAnlzTag {
  static type = "PWV3";
  static name = "wf_detail";
  static LEN_HEADER = 24;

  get() {
    return _parseWfPreview(this.content);
  }
}

class PWV4AnlzTag extends AbstractAnlzTag {
  static type = "PWV4";
  static name = "wf_color";
  static LEN_HEADER = 24;

  get() {
    const numEntries = this.content.lenEntries;
    const data = this.content.entries;
    const ws = 1,
      hs = 1;
    const w = Math.floor(numEntries / ws);
    const colColor = new Array(numEntries);
    const colBlues = new Array(numEntries);
    const heights = new Array(numEntries);

    for (let x = 0; x < w; x++) {
      const d1 = data[x * ws * 6 + 1]; // some kind of luminance boost?
      const d2 = data[x * ws * 6 + 2] & 0x7f; // inverse intensity for blue waveform
      const d3 = data[x * ws * 6 + 3] & 0x7f; // red
      const d4 = data[x * ws * 6 + 4] & 0x7f; // green
      const d5 = data[x * ws * 6 + 5] & 0x7f; // blue and height of front waveform
      const bh = Math.floor(Math.max(d2, d3, d4) / hs); // back height is max of d3, d4 probably d2?
      const fh = Math.floor(d5 / hs); // front height is d5
      const fl = 32; // front luminosity increase (arbitrary)
      heights[x] = [fh, bh];
      const col = [d3, d4, d5].map((val) => val * (d1 / 127));
      colColor[x] = [col, col.map((c) => c + fl)];
      // Blue waveform
      colBlues[x] = [95 - d2 * 1.0, 95 - d2 * 0.5, 95 - d2 * 0.25].map(
        (val) => val + fl
      );
    }
    return [heights, colColor, colBlues];
  }
}

class PWV5AnlzTag extends AbstractAnlzTag {
  static type = "PWV5";
  static name = "wf_color_detail";
  static LEN_HEADER = 24;

  get() {
    const rMask = 0xe000; // 111 000 000 00000 00
    const gMask = 0x1c00; // 000 111 000 00000 00
    const bMask = 0x0380; // 000 000 111 00000 00
    const hMask = 0x007c; // 000 000 000 11111 00

    const n = this.content.lenEntries;
    const heights = new Array(n);
    const colors = new Array(n);

    for (let i = 0; i < n; i++) {
      const x = this.content.entries[i];
      const red = (x & rMask) >> 12;
      const green = (x & gMask) >> 10;
      const blue = (x & bMask) >> 7;
      heights[i] = (x & hMask) >> 2;
      colors[i] = [red, green, blue];
    }

    // Normalize heights to 1:
    const normalizedHeights = heights.map((h) => h / 31);

    return [normalizedHeights, colors];
  }
}

class PWV6AnlzTag extends AbstractAnlzTag {
  static type = "PWV6";
  static name = PWV6AnlzTag.type;
  static LEN_HEADER = 20;
}

class PWV7AnlzTag extends AbstractAnlzTag {
  static type = "PWV7";
  static name = PWV7AnlzTag.type;
  static LEN_HEADER = 24;
}

class PWVCAnlzTag extends AbstractAnlzTag {
  static type = "PWVC";
  static name = PWVCAnlzTag.type;
  static LEN_HEADER = 14;
}

const TAGS = {
  PQTZ: PQTZAnlzTag,
  PQT2: PQT2AnlzTag,
  PCOB: PCOBAnlzTag, // seen in both DAT and EXT files
  PCO2: PCO2AnlzTag, // seen in EXT files
  PPTH: PPTHAnlzTag,
  PVBR: PVBRAnlzTag,
  PSSI: PSSIAnlzTag, // seen in EXT files
  PWAV: PWAVAnlzTag,
  PWV2: PWV2AnlzTag,
  PWV3: PWV3AnlzTag, // seen in EXT files
  PWV4: PWV4AnlzTag, // seen in EXT files
  PWV5: PWV5AnlzTag, // seen in EXT files
  PWV6: PWV6AnlzTag, // seen in 2EX files
  PWV7: PWV7AnlzTag, // seen in 2EX files
  PWVC: PWVCAnlzTag, // seen in 2EX files
};

module.exports = { TAGS };
