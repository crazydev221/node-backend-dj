// -*- coding: utf-8 -*-
// Author: David Anderson
// Date:   2023-11-18

// -- Beat Grid Tag (PQTZ) --------------------------------------------------------------

function AnlzQuantizeTick(data) {
  return {
    beat: data.readUInt16BE(0),
    tempo: data.readUInt16BE(2),
    time: data.readUInt32BE(4),
  };
}

// len_header: 24
class PQTZ {
  static parse(data) {
    const entryCount = data.readUInt32BE(8);
    const entrySize = 8; // Size of AnlzQuantizeTick struct in bytes (2 * uint16 + uint32)

    const entries = [];
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = 12 + i * entrySize;
      const entryData = data.slice(entryOffset, entryOffset + entrySize);
      entries.push(AnlzQuantizeTick(entryData));
    }

    return {
      u1: data.slice(0, 4), // Assuming u1 is a 4-byte value
      u2: data.readUInt32BE(4),
      entry_count: entryCount,
      entries: entries,
    };
  }
}

// Extended Beat Grid Tag (PQT2)
function AnlzQuantizeTick2(data) {
  return {
    beat: data.readUInt8(0),
    unknown: data.readUInt8(1),
  };
}

// len_header: 56
class PQT2 {
  static parse(data) {
    const entryCount = data.readUInt32BE(28); // Offset for entry_count
    const entries = [];
    console.log(entryCount);

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = 44 + i * 2; // Offset for entries
      const entryData = data.slice(entryOffset, entryOffset + 2);
      entries.push(AnlzQuantizeTick2(entryData));
    }

    return {
      u1: data.readUInt32BE(4),
      bpm: [
        AnlzQuantizeTick(data.slice(12, 20)),
        AnlzQuantizeTick(data.slice(20, 28)),
      ],
      entry_count: entryCount,
      u3: data.readUInt32BE(32),
      u4: data.readUInt32BE(36),
      u5: data.readUInt32BE(40),
      entries: entries,
    };
  }
}

// -- Cue List Tag (PCOB) ---------------------------------------------------------------
function AnlzCuePointType(data) {
  const value = data.readUInt8(0);
  return {
    value,
    single: value === 1,
    loop: value === 2,
  };
}

function AnlzCuePointStatus(data) {
  const value = data.readUInt32BE(0);
  return {
    value,
    disabled: value === 0,
    enabled: value === 4,
  };
}

function AnlzTagCueObjectType(data) {
  const value = data.readUInt32BE(0);
  return {
    value,
    memory: value === 0,
    hotcue: value === 1,
  };
}

function AnlzCuePoint(data) {
  return {
    type: data.toString("utf-8", 0, 4), // "PCPT",
    len_header: data.readUInt32BE(4),
    len_entry: data.readUInt32BE(8),
    hot_cue: data.readUInt32BE(12),
    status: AnlzCuePointStatus(data.slice(16, 20)),
    u1: data.readUInt32BE(20),
    order_first: data.readUInt16BE(24),
    order_last: data.readUInt16BE(26),
    type: AnlzCuePointType(data.slice(28, 29)),
    u2: data.readUInt16BE(30),
    time: data.readUInt32BE(32),
    loop_time: data.readUInt32BE(36),
  };
}

// len_header: 24
class PCOB {
  static parse(data) {
    const cue_type = AnlzTagCueObjectType(data.slice(0, 4));
    const unk = data.readUInt16BE(4);
    const count = data.readUInt16BE(6);
    const memoryCount = data.readInt32BE(8);
    const entries = [];
    let offset = 12;
    let entry_size = 56;

    for (let i = 0; i < count; i++) {
      const entryData = data.slice(offset);
      const entry = AnlzCuePoint(entryData);
      entries.push(entry);
      offset += entry_size;
    }

    return {
      cue_type,
      unk,
      count,
      memory_count: memoryCount,
      entries,
    };
  }
}

// Extended (nxs2) Cue List Tag (PCO2)
function AnlzCuePoint2(data) {
  // console.log(
  //   "crgb -> ",
  //   data.readUInt8(44),
  //   data.readUInt8(45),
  //   data.readUInt8(46),
  //   data.readUInt8(47)
  // );
  var lencomment = data.readUInt32BE(40);
  // console.log("len_comment", lencomment);
  return {
    type: data.toString("utf-8", 0, 4), // "PCP2",
    len_header: data.readUInt32BE(4),
    len_entry: data.readUInt32BE(8),
    hot_cue: data.readUInt32BE(12),
    type: data.readUInt8(16),

    time: data.readUInt32BE(20),
    loop_time: data.readUInt32BE(24),
    color_id: data.readUInt8(28),
    loop_enumerator: data.readUInt16BE(36),
    loop_denominator: data.readUInt16BE(38),
    len_comment: data.readUInt32BE(40),
    comment: data.toString("utf-8", 44, 44 + lencomment),
    color_code: data.readUInt8(44 + lencomment),
    color_red: data.readUInt8(45 + lencomment),
    color_green: data.readUInt8(46 + lencomment),
    color_blue: data.readUInt8(47 + lencomment),
  };
}

// len_header: 20
class PCO2 {
  static parse(data) {
    const cueType = AnlzTagCueObjectType(data.slice(0, 4));
    const count = data.readUInt16BE(4);
    const unknown = data.readUInt16BE(6);
    const entries = [];
    let offset = 8;
    // console.log("data->", data.slice(8, 96).toString("utf-8")); // entrylength-88 type-1 len_cue-8

    for (let i = 0; i < count; i++) {
      const entryData = data.slice(offset);
      let entry_size = entryData.readUInt32BE(8);
      const entry = AnlzCuePoint2(entryData);
      entries.push(entry);
      offset += entry_size;
    }

    // console.log(
    //   "type",
    //   cueType,
    //   "cnt",
    //   count,
    //   "un",
    //   unknown,
    //   "entries",
    //   entries
    // );

    return {
      type: cueType,
      count,
      unknown,
      entries,
    };
  }
}

// -- Path Tag (PPTH) -------------------------------------------------------------------

// len_header: 16
class PPTH {
  static parse(data) {
    const lenPath = data.readUInt32BE(0);
    const path_le = data.toString("utf16le", 4, 4 + lenPath - 2);
    const path = Buffer.from(path_le, "utf16le").swap16().toString("utf16le");

    const padding = data.slice(4 + lenPath - 2, 4 + lenPath);

    return {
      len_path: lenPath,
      path: path,
      // padding: padding,
    };
  }
}

// len_header: 16
class PVBR {
  static parse(data) {
    const u1 = data.readUInt32BE(0);
    const idx = [];
    for (let i = 4; i < 1604; i += 4) {
      idx.push(data.readUInt32BE(i));
    }
    const u2 = data.readUInt32BE(1604);

    return {
      u1,
      idx,
      u2,
    };
  }
}

// -- (Tiny) Waveform Preview Tag (PWAV / PWV2) -----------------------------------------

// len_header: 20
class PWAV {
  static parse(data) {
    const lenPreview = data.readUInt32BE(0);
    const unknown = data.readUInt32BE(4);
    const entries = [];
    for (let i = 8; i < lenPreview + 8; i++) {
      entries.push(data.readUInt8(i));
    }

    return {
      len_preview: lenPreview,
      unknown,
      entries,
    };
  }
}

// len_header: 20
class PWV2 {
  static parse(data) {
    const len_preview = data.readUInt32BE(0);
    const unknown = data.readUInt32BE(4);
    const entries = Array.from({ length: len_preview }, (_, index) =>
      data.readInt8(8 + index)
    );

    return {
      len_preview,
      unknown,
      entries,
    };
  }
}

// -- Waveform Detail Tag (PWV3) --------------------------------------------------------

// len_header: 24
class PWV3 {
  static parse(data) {
    const len_entry_bytes = data.readUInt32BE(0);
    const len_entries = data.readUInt32BE(4);
    const u1 = data.readUInt32BE(8);
    const entries = Array.from({ length: len_entries }, (_, index) =>
      data.readInt8(12 + index)
    );

    return {
      len_entry_bytes,
      len_entries,
      u1,
      entries,
    };
  }
}

// -- Waveform Color Preview Tag (PWV4) -------------------------------------------------

// len_header: 24
class PWV4 {
  static parse(data) {
    const len_entry_bytes = 6;
    const len_entries = data.readUInt32BE(4);
    const unknown = data.readUInt32BE(8);
    const entries = data.slice(12);

    return {
      len_entry_bytes,
      len_entries,
      unknown,
      entries,
    };
  }
}

// -- Waveform Color Detail Tag (PWV5) --------------------------------------------------
class PWV5 {
  static parse(data) {
    const len_entry_bytes = 2;
    const len_entries = data.readUInt32BE(4);
    const unknown = data.readUInt32BE(8);
    const entries = Array.from({ length: len_entries }, (_, index) =>
      data.readInt16BE(12 + index * 2)
    );

    return {
      len_entry_bytes,
      len_entries,
      unknown,
      entries,
    };
  }
}

// -- Song Structure Tag (PSSI) ---------------------------------------------------------
function SongStructureEntry(data) {
  return {
    index: data.readInt16BE(0),
    beat: data.readInt16BE(2),
    kind: data.readInt16BE(4),
    u1: data.readInt8(6),
    k1: data.readInt8(7),
    u2: data.readInt8(8),
    k2: data.readInt8(9),
    u3: data.readInt8(10),
    b: data.readInt8(11),
    beat_2: data.readInt16BE(12),
    beat_3: data.readInt16BE(14),
    beat_4: data.readInt16BE(16),
    u4: data.readInt8(18),
    k3: data.readInt8(19),
    u5: data.readInt8(20),
    fill: data.readInt8(21),
    beat_fill: data.readInt16BE(22),
  };
}

// len_header: 32
class PSSI {
  static parse(data) {
    const len_entry_bytes = 24;
    const len_entries = data.readUInt16BE(4);
    const mood = data.readUInt16BE(6);
    const u1 = data.slice(8, 14);
    const end_beat = data.readInt16BE(14);
    const u2 = data.slice(16, 18);
    const bank = data.readInt8(18);
    const u3 = data.slice(19, 20);
    const entries = Array.from({ length: len_entries }, (_, index) =>
      SongStructureEntry(
        data.slice(
          20 + index * len_entry_bytes,
          20 + (index + 1) * len_entry_bytes
        )
      )
    );

    return {
      len_entry_bytes,
      len_entries,
      mood,
      u1,
      end_beat,
      u2,
      bank,
      u3,
      entries,
    };
  }
}

// -- PWV6 ------------------------------------------------------------------------------
// len_header: 20
class PWV6 {
  static parse(data) {
    const len_entry_bytes = 3;
    const len_entries = data.readUInt32BE(4);
    const entries = data.slice(8);

    return {
      len_entry_bytes,
      len_entries,
      entries,
    };
  }
}

// -- PWV7 ------------------------------------------------------------------------------
// len_header: 24
class PWV7 {
  static parse(data) {
    const len_entry_bytes = 3;
    const len_entries = data.readUInt32BE(4);
    const unknown = data.readUInt32BE(8);
    const entries = data.slice(12);

    return {
      len_entry_bytes,
      len_entries,
      unknown,
      entries,
    };
  }
}
// -- PWVC ------------------------------------------------------------------------------
// len_header: 14
class PWVC {
  static parse(data) {
    return {
      unknown: data.readInt16BE(0),
      data: Array.from({ length: 3 }, (_, index) =>
        data.readInt16BE(2 + index * 2)
      ),
    };
  }
}

// -- Main Items ------------------------------------------------------------------------

class AnlzFileHeader {
  static parse(data) {
    return {
      type: data.toString("utf-8", 0, 4),
      len_header: data.readUInt32BE(4),
      len_file: data.readUInt32BE(8),
      u1: data.readUInt32BE(12),
      u2: data.readUInt32BE(16),
      u3: data.readUInt32BE(20),
      u4: data.readUInt32BE(24),
    };
  }
}

class AnlzTag {
  static parse(data) {
    const type = data.toString("utf-8", 0, 4);
    const len_header = data.readUInt32BE(4);
    const len_tag = data.readUInt32BE(8);

    let content, name;
    switch (type) {
      case "PQTZ":
        content = PQTZ.parse(data.slice(12, 12 + len_tag));
        name = "beat_grid";
        break;
      case "PQT2":
        content = PQT2.parse(data.slice(12, 12 + len_tag));
        name = "beat_grid2";
        break;
      case "PCOB":
        content = PCOB.parse(data.slice(12, 12 + len_tag));
        name = "cue_list";
        break;
      case "PCO2":
        content = PCO2.parse(data.slice(12, 12 + len_tag));
        name = "cue_list2";
        break;
      case "PPTH":
        content = PPTH.parse(data.slice(12, 12 + len_tag));
        name = "path";
        break;
      case "PVBR":
        content = PVBR.parse(data.slice(12, 12 + len_tag));
        name = "vbr";
        break;
      case "PSSI":
        content = PSSI.parse(data.slice(12, 12 + len_tag));
        name = "structure";
        break;
      case "PWAV":
        content = PWAV.parse(data.slice(12, 12 + len_tag));
        name = "wf_preview";
        break;
      case "PWV2":
        content = PWV2.parse(data.slice(12, 12 + len_tag));
        name = "wf_tiny_preview";
        break;
      case "PWV3":
        content = PWV3.parse(data.slice(12, 12 + len_tag));
        name = "wf_detail";
        break;
      case "PWV4":
        content = PWV4.parse(data.slice(12, 12 + len_tag));
        name = "wf_color";
        break;
      case "PWV5":
        content = PWV5.parse(data.slice(12, 12 + len_tag));
        name = "wf_color_detail";
        break;
      case "PWV6":
        content = PWV6.parse(data.slice(12, 12 + len_tag));
        name = "PWV6";
        break;
      case "PWV7":
        content = PWV7.parse(data.slice(12, 12 + len_tag));
        name = "PWV7";
        break;
      case "PWVC":
        content = PWVC.parse(data.slice(12, 12 + len_tag));
        name = "PWVC";
        break;
      default:
        content = data.slice(12, 12 + len_tag); // Default: read Bytes based on lenTag
        name = "default";
    }

    return {
      type,
      name,
      len_header,
      len_tag,
      content,
    };
  }

  static parseStream(data) {
    const stream = Buffer.from(data);

    try {
      return this._parseReport(stream, "(parsing)");
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = { AnlzFileHeader, AnlzTag };
