const fs = require("fs");
const path = require("path");
const { Settings, MySetting } = require("./Structs");

function readMySettingFile(filePath) {
  const fileName = path.basename(filePath);
  const obj = FILES[fileName];
  return obj.parseFile(filePath, fileName);
}

const CRC16_XMODEM_TABLE = [
  0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108,
  0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210,
  0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b,
  0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401,
  0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee,
  0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6,
  0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d,
  0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
  0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5,
  0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc,
  0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4,
  0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd,
  0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13,
  0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a,
  0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e,
  0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
  0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1,
  0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb,
  0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0,
  0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8,
  0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657,
  0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9,
  0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882,
  0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
  0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e,
  0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07,
  0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d,
  0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74,
  0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
];

const RE_INVALID_KEY = /\d/; // /[_u][0-9]?/i;

function computeChecksum(data, struct) {
  const start = struct === structs.DjmMySetting ? 0 : 104;
  let crc = 0;

  for (const byte of data.slice(start, -4)) {
    crc =
      ((crc << 8) & 0xff00) ^ CRC16_XMODEM_TABLE[((crc >> 8) & 0xff) ^ byte];
  }

  return crc;
}

function isValidKey(k) {
  return !(RE_INVALID_KEY.test(k) || k.startsWith("_"));
}

class SettingsFile {
  constructor() {
    this.parsed = null;
    this._items = {};
  }

  static parse(data, name) {
    const instance = new this();
    instance._parse(data, name);
    return instance;
  }

  static parseFile(path, name) {
    const data = fs.readFileSync(path);
    return this.parse(data, name);
  }

  _parse(data, name) {
    const parsed = Settings.parse(data, name);
    console.log("parsed :", parsed);
    const keys = Object.keys(parsed.data).filter(isValidKey);
    const items = {};

    // console.log(Object.keys(parsed.data));
    for (const key of keys) {
      // console.log("filtered key-", key, parsed.data[key].value);
      const key_data = parsed.data[key];
      for (const k of Object.keys(key_data)) {
        if (k !== "value" && key_data[k] === true) {
          items[key] = String(k);
          break;
        }
      }
      if (items[key] === undefined || items[key] === null) {
        items[key] = "Invalid value";
      }
      // items[key] = String(parsed.data[key]);
    }

    this.parsed = parsed;
    this._items = { ...items };
  }

  get length() {
    return Object.keys(this.defaults).length;
  }

  *[Symbol.iterator]() {
    yield* Object.keys(this.defaults);
  }

  get(key) {
    try {
      return this._items[key] || this.defaults[key];
    } catch (error) {
      return null;
    }
  }

  set(key, value) {
    if (!(key in this.defaults)) {
      throw new Error(
        `Key ${key} not a valid field of ${this.constructor.name}`
      );
    }

    this._items[key] = value;
  }

  delete(key) {
    delete this._items[key];
  }

  build() {
    const items = { ...this.defaults, ...this._items };
    const fileItems = { data: items, checksum: 0 };

    if (this.version) {
      fileItems.version = this.version;
    }

    const data = this.struct.build(fileItems);
    const checksum = computeChecksum(data, this.struct);
    fileItems.checksum = checksum;

    return this.struct.build(fileItems);
  }

  save(path) {
    const data = this.build();
    fs.writeFileSync(path, data);
  }
}

class MySettingFile extends SettingsFile {
  static get struct() {
    return MySetting;
  }

  get defaults() {
    return {
      auto_cue: structs.AutoCue.on,
      auto_cue_level: structs.AutoCueLevel.memory,
      disc_slot_illumination: structs.DiscSlotIllumination.bright,
      eject_lock: structs.EjectLock.unlock,
      hotcue_autoload: structs.HotCueAutoLoad.on,
      hotcue_color: structs.HotCueColor.off,
      jog_mode: structs.JogMode.vinyl,
      jog_ring_brightness: structs.JogRingBrightness.bright,
      jog_ring_indicator: structs.JogRingIndicator.on,
      language: structs.Language.english,
      lcd_brightness: structs.LCDBrightness.three,
      master_tempo: structs.MasterTempo.off,
      needle_lock: structs.NeedleLock.lock,
      on_air_display: structs.OnAirDisplay.on,
      phase_meter: structs.PhaseMeter.type1,
      play_mode: structs.PlayMode.single,
      quantize: structs.Quantize.on,
      quantize_beat_value: structs.QuantizeBeatValue.one,
      slip_flashing: structs.SlipFlashing.on,
      sync: structs.Sync.off,
      tempo_range: structs.TempoRange.ten,
      time_mode: structs.TimeMode.remain,
    };
  }
}

class MySetting2File extends SettingsFile {
  static get struct() {
    return structs.MySetting2;
  }

  static get_defaults() {
    return {
      vinyl_speed_adjust: structs.VinylSpeedAdjust.touch,
      jog_display_mode: structs.JogDisplayMode.auto,
      pad_button_brightness: structs.PadButtonBrightness.three,
      jog_lcd_brightness: structs.JogLCDBrightness.three,
      waveform_divisions: structs.WaveformDivisions.phrase,
      waveform: structs.Waveform.waveform,
      beat_jump_beat_value: structs.BeatJumpBeatValue.sixteen,
    };
  }
}

class DjmMySettingFile extends SettingsFile {
  static get struct() {
    return structs.DjmMySetting;
  }

  static get_defaults() {
    return {
      channel_fader_curve: structs.ChannelFaderCurve.linear,
      cross_fader_curve: structs.CrossfaderCurve.fast_cut,
      headphones_pre_eq: structs.HeadphonesPreEQ.post_eq,
      headphones_mono_split: structs.HeadphonesMonoSplit.stereo,
      beat_fx_quantize: structs.BeatFXQuantize.on,
      mic_low_cut: structs.MicLowCut.on,
      talk_over_mode: structs.TalkOverMode.advanced,
      talk_over_level: structs.TalkOverLevel.minus_18db,
      midi_channel: structs.MidiChannel.one,
      midi_button_type: structs.MidiButtonType.toggle,
      display_brightness: structs.MixerDisplayBrightness.five,
      indicator_brightness: structs.MixerIndicatorBrightness.three,
      channel_fader_curve_long: structs.ChannelFaderCurveLong.exponential,
    };
  }
}

class DevSettingFile extends SettingsFile {
  static get struct() {
    return structs.DevSetting;
  }

  static get_defaults() {
    return {
      entries: "",
    };
  }
}

const FILES = {
  "DEVSETTING.DAT": DevSettingFile,
  "DJMMYSETTING.DAT": DjmMySettingFile,
  "MYSETTING.DAT": MySettingFile,
  "MYSETTING2.DAT": MySetting2File,
};

module.exports = { readMySettingFile };
