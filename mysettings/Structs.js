// -*- coding: utf-8 -*-
// Author: David Anderson
// Date:   2023-11-19

const {
  // byteArrayToStringWithTrim,
  byteArrayToStringWithoutTail,
} = require("../utils/helpfunc");

const len_sett_header = 104;

function ChannelFaderCurve(data) {
  const value = data.readUInt8();
  return {
    value,
    steep_top: value === 0x80,
    linear: value === 0x81,
    steep_bottom: value === 0x82,
  };
}
function CrossfaderCurve(data) {
  const value = data.readUint8(0);
  return {
    value,
    constant: value === 0x80,
    slow_cut: value === 0x81,
    fast_cut: value === 0x82,
  };
}
function HeadphonesPreEQ(data) {
  const value = data.readUint8(0);
  return {
    value,
    post_eq: value === 0x80,
    pre_eq: value === 0x81,
  };
}
function HeadphonesMonoSplit(data) {
  const value = data.readUint8(0);
  return {
    value,
    stereo: value === 0x80,
    mono_split: value === 0x81,
  };
}
function BeatFXQuantize(data) {
  const value = data.readUint8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function MicLowCut(data) {
  const value = data.readUint8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function TalkOverMode(data) {
  const value = data.readUint8(0);
  return {
    value,
    advanced: value === 0x80,
    normal: value === 0x81,
  };
}
function TalkOverLevel(data) {
  const value = data.readUint8(0);
  return {
    value,
    minus_24db: value === 0x80,
    minus_18db: value === 0x81,
    minus_12db: value === 0x82,
    minus_6db: value === 0x83,
  };
}
function MidiChannel(data) {
  const value = data.readUint8(0);
  return {
    value,
    one: value === 0x80,
    two: value === 0x81,
    three: value === 0x82,
    four: value === 0x83,
    five: value === 0x84,
    six: value === 0x85,
    seven: value === 0x86,
    eight: value === 0x87,
    nine: value === 0x88,
    ten: value === 0x89,
    eleven: value === 0x8a,
    twelve: value === 0x8b,
    thirteen: value === 0x8c,
    fourteen: value === 0x8d,
    fifteen: value === 0x8e,
    sixteen: value === 0x8f,
  };
}
function MidiButtonType(data) {
  const value = data.readUint8(0);
  return {
    value,
    toggle: value === 0x80,
    trigger: value === 0x81,
  };
}
function MixerDisplayBrightness(data) {
  const value = data.readUint8(0);
  return {
    value,
    white: value === 0x80,
    one: value === 0x81,
    two: value === 0x82,
    three: value === 0x83,
    four: value === 0x84,
    five: value === 0x85,
  };
}
function MixerIndicatorBrightness(data) {
  const value = data.readUint8(0);
  return {
    value,
    one: value === 0x80,
    two: value === 0x81,
    three: value === 0x82,
  };
}
function ChannelFaderCurveLong(data) {
  const value = data.readUint8(0);
  return {
    value,
    exponential: value === 0x80,
    smooth: value === 0x81,
    linear: value === 0x82,
  };
}

// 52 bytes
class DjmMySettingBody {
  static parse(data) {
    return {
      u1: data.slice(0, 12), // Default(Bytes(12), b"xV4\x12\x01\x00\x00\x00 \x00\x00\x00")
      channel_fader_curve: ChannelFaderCurve(data.slice(12, 13)),
      cross_fader_curve: CrossfaderCurve(data.slice(13, 14)),
      headphones_pre_eq: HeadphonesPreEQ(data.slice(14, 15)),
      headphones_mono_split: HeadphonesMonoSplit(data.slice(15, 16)),
      beat_fx_quantize: BeatFXQuantize(data.slice(16, 17)),
      mic_low_cut: MicLowCut(data.slice(17, 18)),
      talk_over_mode: TalkOverMode(data.slice(18, 19)),
      talk_over_level: TalkOverLevel(data.slice(19, 20)),
      midi_channel: MidiChannel(data.slice(20, 21)),
      midi_button_type: MidiButtonType(data.slice(21, 22)),
      display_brightness: MixerDisplayBrightness(data.slice(22, 23)),
      indicator_brightness: MixerIndicatorBrightness(data.slice(23, 24)),
      channel_fader_curve_long: ChannelFaderCurveLong(data.slice(24, 25)),
      u2: data.slice(25, 52), // Padding(27)  # Unknown values, always 0 (27 bytes)
    };
  }
}

// -- MySettings ------------------------------------------------------------------------

function OnAirDisplay(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function LCDBrightness(data) {
  const value = data.readUInt8(0);
  return {
    value,
    one: value === 0x81,
    two: value === 0x82,
    three: value === 0x83,
    four: value === 0x84,
    five: value === 0x85,
  };
}
function Quantize(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function AutoCueLevel(data) {
  const value = data.readUInt8(0);
  return {
    value,
    minus_36db: value === 0x80,
    minus_42db: value === 0x81,
    minus_48db: value === 0x82,
    minus_54db: value === 0x83,
    minus_60db: value === 0x84,
    minus_66db: value === 0x85,
    minus_72db: value === 0x86,
    minus_78db: value === 0x87,
    memory: value === 0x88,
  };
}
function Language(data) {
  const value = data.readUInt8(0);
  return {
    value,
    english: value === 0x81,
    french: value === 0x82,
    german: value === 0x83,
    italian: value === 0x84,
    dutch: value === 0x85,
    spanish: value === 0x86,
    russian: value === 0x87,
    korean: value === 0x88,
    chinese_simplified: value === 0x89,
    chinese_traditional: value === 0x8a,
    japanese: value === 0x8b,
    portuguese: value === 0x8c,
    swedish: value === 0x8d,
    czech: value === 0x8e,
    hungarian: value === 0x8f,
    danish: value === 0x90,
    greek: value === 0x91,
    turkish: value === 0x92,
  };
}
function JogRingBrightness(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    dark: value === 0x81,
    bright: value === 0x82,
  };
}
function JogRingIndicator(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function SlipFlashing(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function DiscSlotIllumination(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    dark: value === 0x81,
    bright: value === 0x82,
  };
}
function EjectLock(data) {
  const value = data.readUInt8(0);
  return {
    value,
    unlock: value === 0x80,
    lock: value === 0x81,
  };
}
function Sync(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function PlayMode(data) {
  const value = data.readUInt8(0);
  return {
    value,
    continue_: value === 0x80,
    single: value === 0x81,
  };
}
function QuantizeBeatValue(data) {
  const value = data.readUInt8(0);
  return {
    value,
    one: value === 0x80,
    half: value === 0x81,
    quarter: value === 0x82,
    eighth: value === 0x83,
  };
}
function HotCueAutoLoad(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
    rekordbox: value === 0x82,
  };
}
function HotCueColor(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function NeedleLock(data) {
  const value = data.readUInt8(0);
  return {
    value,
    unlock: value === 0x80,
    lock: value === 0x81,
  };
}
function TimeMode(data) {
  const value = data.readUInt8(0);
  return {
    value,
    elapsed: value === 0x80,
    remain: value === 0x81,
  };
}
function JogMode(data) {
  const value = data.readUInt8(0);
  return {
    value,
    cdj: value === 0x80,
    vinyl: value === 0x81,
  };
}
function AutoCue(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function MasterTempo(data) {
  const value = data.readUInt8(0);
  return {
    value,
    off: value === 0x80,
    on: value === 0x81,
  };
}
function TempoRange(data) {
  const value = data.readUInt8(0);
  return {
    value,
    six: value === 0x80,
    ten: value === 0x81,
    sixteen: value === 0x82,
    wide: value === 0x83,
  };
}
function PhaseMeter(data) {
  const value = data.readUInt8(0);
  return {
    value,
    type1: value === 0x80,
    type2: value === 0x81,
  };
}

// 40 bytes
class MySettingBody {
  static parse(data) {
    // console.log(data.slice(104).toString("hex"));
    // console.log("msb test -> ", data.readUInt8(29, 30));
    // Parsing sub-structures using the defined parsers
    const u1 = [120, 86, 52, 18, 2, 0, 0, 0];
    const on_air_display = OnAirDisplay(data.slice(8, 9));
    const lcd_brightness = LCDBrightness(data.slice(9, 10));
    const quantize = Quantize(data.slice(10, 11));
    const autoCueLevel = AutoCueLevel(data.slice(11, 12));
    const language = Language(data.slice(12, 13));
    const jog_ring_brightness = JogRingBrightness(data.slice(14, 15));
    const jog_ring_indicator = JogRingIndicator(data.slice(15, 16));
    const slip_flashing = SlipFlashing(data.slice(16, 17));
    const disc_slot_illumination = DiscSlotIllumination(data.slice(20, 21));
    const eject_lock = EjectLock(data.slice(21, 22));
    const sync = Sync(data.slice(22, 23));
    const play_mode = PlayMode(data.slice(23, 24));
    const quantize_beat_value = QuantizeBeatValue(data.slice(24, 25));
    const hotCueAutoLoad = HotCueAutoLoad(data.slice(25, 26));
    const hotCueColor = HotCueColor(data.slice(26, 27));
    const needle_lock = NeedleLock(data.slice(29, 30));
    const time_mode = TimeMode(data.slice(32, 33));
    const jog_mode = JogMode(data.slice(33, 34));
    const auto_cue = AutoCue(data.slice(34, 35));
    const master_tempo = MasterTempo(data.slice(35, 36));
    const tempoRange = TempoRange(data.slice(36, 37));
    const phase_meter = PhaseMeter(data.slice(37, 38));

    return {
      u1, // Assuming u1 is an 8-byte value
      on_air_display,
      lcd_brightness,
      quantize,
      auto_cue_level: autoCueLevel,
      language,
      u2: 1,
      jog_ring_brightness,
      jog_ring_indicator,
      slip_flashing,
      u3: data.slice(18, 21),
      disc_slot_illumination,
      eject_lock,
      sync,
      play_mode,
      quantize_beat_value,
      hotcue_autoload: hotCueAutoLoad,
      hotcue_color: hotCueColor,
      u4: 0, // Always 0
      needle_lock,
      u5: 0, // Always 0
      time_mode,
      jog_mode,
      auto_cue,
      master_tempo,
      tempo_range: tempoRange,
      phase_meter,
      u6: 0, // Always 0
    };
  }
}

// -- MySettings2 -----------------------------------------------------------------------

function VinylSpeedAdjust(data) {
  const value = data.readUInt8(0);
  return {
    value,
    touch_release: value === 0x80,
    touch: value === 0x81,
    release: value === 0x82,
  };
}
function JogDisplayMode(data) {
  const value = data.readUInt8(0);
  return {
    value,
    auto: value === 0x80,
    info: value === 0x81,
    simple: value === 0x82,
    artwork: value === 0x83,
  };
}
function PadButtonBrightness(data) {
  const value = data.readUInt8(0);
  return {
    value,
    one: value === 0x81,
    two: value === 0x82,
    three: value === 0x83,
    four: value === 0x84,
  };
}
function JogLCDBrightness(data) {
  const value = data.readUInt8(0);
  return {
    value,
    one: value === 0x81,
    two: value === 0x82,
    three: value === 0x83,
    four: value === 0x84,
    five: value === 0x85,
  };
}
function WaveformDivisions(data) {
  const value = data.readUInt8(0);
  return {
    value,
    time_scale: value === 0x80,
    phrase: value === 0x81,
  };
}
function Waveform(data) {
  const value = data.readUInt8(0);
  return {
    value,
    waveform: value === 0x80,
    phase_meter: value === 0x81,
  };
}
function BeatJumpBeatValue(data) {
  const value = data.readUInt8(0);
  return {
    value,
    half: value === 0x80,
    one: value === 0x81,
    two: value === 0x82,
    four: value === 0x83,
    eight: value === 0x84,
    sixteen: value === 0x85,
    thirtytwo: value === 0x86,
    sixtyfour: value === 0x87,
  };
}

// 40 bytes
class MySetting2Body {
  static parse(data) {
    return {
      vinyl_speed_adjust: VinylSpeedAdjust(data),
      jog_display_mode: JogDisplayMode(data.slice(1)),
      pad_button_brightness: PadButtonBrightness(data.slice(2)),
      jog_lcd_brightness: JogLCDBrightness(data.slice(3)),
      waveform_divisions: WaveformDivisions(data.slice(4)),
      u1: data.slice(5, 10),
      waveform: Waveform(data.slice(10)),
      u2: data.readUInt8(11) || 0x81,
      beat_jump_beat_value: BeatJumpBeatValue(data.slice(12)),
      u3: data.slice(13, 40),
    };
  }
}

// -- DevSettings -----------------------------------------------------------------------

// 32 bytes
class DevSettingBody {
  static parse(data) {
    return {
      u1: data.slice(0, 8).toString("ascii"),
      entries: data.slice(8, 32),
    };
  }
}

// -- Main Tags -------------------------------------------------------------------------

class DjmMySetting {
  static parse(data) {
    const len_data = 52;
    return {
      len_strings: 0x0060,
      brand: "PioneerDJ",
      software: "rekordbox",
      version: "1.000",
      len_data: 52,
      data: DjmMySettingBody.parse(data.slice(len_sett_header)),
      checksum: data.readUInt16LE(len_sett_header + len_data),
      unknown: 0x00,
    };
  }
}

class MySetting {
  static parse(data) {
    const len_data = 40;
    return {
      len_strings: 0x0060,
      brand: "PIONEER",
      software: "rekordbox",
      version: "0.001",
      len_data: 40,
      data: MySettingBody.parse(data.slice(len_sett_header)),
      checksum: data.readUInt16LE(len_sett_header + len_data),
      unknown: 0x00,
    };
  }
}

class MySetting2 {
  static parse(data) {
    const len_data = 40;
    return {
      len_strings: 0x0060,
      brand: "PIONEER",
      software: "rekordbox",
      version: "0.001",
      len_data: 40,
      data: MySetting2Body.parse(data.slice(len_sett_header)),
      checksum: data.readUInt16LE(len_sett_header + len_data),
      unknown: 0x00,
    };
  }
}

class DevSetting {
  static parse(data) {
    const len_data = 32;
    return {
      len_strings: 0x0060,
      brand: "PIONEER DJ",
      software: "rekordbox",
      version: byteArrayToStringWithoutTail(data.slice(68)),
      len_data: 32,
      data: DevSettingBody.parse(data.slice(len_sett_header)),
      checksum: data.readUInt16LE(len_sett_header + len_data),
      unknown: 0x00,
    };
  }
}
class Settings {
  static parse(data, name) {
    // let len_header = data.readUInt32LE();
    // const brand = byteArrayToStringWithTrim(data.slice(4, 36));
    // const software = byteArrayToStringWithTrim(data.slice(36, 68));
    // const version = byteArrayToStringWithTrim(data.slice(68, 100));
    // const len_data = data.readUInt32LE(100);
    console.log(name);
    // console.log(data.toString("hex", 100, 104));
    switch (name) {
      case "DEVSETTING.DAT":
        return DevSetting.parse(data);
      case "DJMMYSETTING.DAT":
        return DjmMySetting.parse(data);
      case "MYSETTING.DAT":
        return MySetting.parse(data);
      case "MYSETTING2.DAT":
        return MySetting2.parse(data);
      default:
        return data.slice(len_sett_header);
    }
  }
}

module.exports = { Settings, MySetting };
