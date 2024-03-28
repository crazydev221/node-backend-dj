const { AnlzFileHeader, AnlzTag } = require("./Struct");
const { TAGS } = require("./Tags");
const fs = require("fs");
const path = require("path");

const XOR_MASK = Buffer.from("CBE1EEFAE5EEADEEE9D2E9EBE1E9F3E8E9F4E1", "hex");

class BuildFileLengthError extends Error {
  constructor(struct, lenData) {
    super(
      `\`len_file\` (${struct.len_file}) of '${struct.type}' does not match the data length (${lenData})!`
    );
  }
}

class AnlzFile {
  constructor() {
    this._path = "";
    this.fileHeader = null;
    this.tags = [];
  }

  get numTags() {
    return this.tags.length;
  }

  get tagTypes() {
    return this.tags.map((tag) => tag.type);
  }

  get path() {
    return this._path;
  }

  static parse(data) {
    const anlzFile = new AnlzFile();
    anlzFile._parse(data);
    return anlzFile;
  }

  static parseFile(_path) {
    // console.log(_path);
    const ext = path.extname(_path);
    if (![".DAT", ".EXT", ".2EX"].includes(ext)) {
      throw new Error(`File type '${ext}' not supported!`);
    }

    const data = fs.readFileSync(_path);
    // console.log(data.length);
    const anlzFile = AnlzFile.parse(data);
    anlzFile._path = _path;
    return anlzFile;
  }

  _parse(data) {
    // console.log(data.toString("utf-8", 0, 400));
    const fileHeader = AnlzFileHeader.parse(data);
    console.log("--- Anlz File Header --- \n", fileHeader);
    const tagType = fileHeader.type.toString("ascii");
    if (tagType !== "PMAI") {
      throw new Error(`Unexpected file type: ${tagType}`);
    }

    const tags = [];
    let i = fileHeader.len_header;

    console.log("\n--- Anlz Tags ---");
    while (i < fileHeader.len_file) {
      let tagData = data.slice(i);
      const tagType = tagData.slice(0, 4).toString("ascii");
      if (tagType === "PSSI") {
        // Check if the file is garbled (only on exported files)
        const mood = tagData.readUInt16BE(18);
        const bank = tagData.readUInt16BE(28);
        if (mood >= 1 && mood <= 3 && bank >= 1 && bank <= 8) {
          console.log("PSSI is not garbled!");
        } else {
          console.log("PSSI is garbled!");
          const lenEntries = tagData.readUInt16BE(16);
          tagData = Buffer.from(tagData);
          for (let x = 0; x < tagData.slice(18).length; x++) {
            let mask = XOR_MASK[x % XOR_MASK.length] + lenEntries;
            if (mask > 255) {
              mask -= 256;
            }
            tagData.writeUInt8(tagData.readUInt8(x + 18) ^ mask, x + 18);
          }
        }
      }

      var lenTag = 0;
      try {
        // console.log(tagData.toString("hex", 0, 100));
        const tag = new TAGS[tagType](tagData);
        tags.push(tag);
        const lenHeader = tag.struct.len_header;
        lenTag = tag.struct.len_tag;
        console.log(
          `Parsed struct '${tagType}' (lenHeader=${lenHeader}, lenTag=${lenTag})`
        );
      } catch (error) {
        // console.log(error);
        console.warn(`Tag '${tagType}' not supported!`);
        const tag = AnlzTag.parse(tagData);
        lenTag = tag.len_tag;
        return;
      }
      console.log("index", i, lenTag);
      i += lenTag;
    }

    this.fileHeader = fileHeader;
    this.tags = tags;
  }

  updateLen() {
    let tagsLen = 0;
    for (const tag of this.tags) {
      tag.updateLen();
      tagsLen += tag.struct.lenTag;
    }
    const lenFile = this.fileHeader.len_header + tagsLen;
    this.fileHeader.len_file = lenFile;
  }

  build() {
    this.updateLen();
    const headerData = new Struct().build(this.fileHeader);
    const sectionData = Buffer.concat(this.tags.map((tag) => tag.build()));
    const data = Buffer.concat([headerData, sectionData]);

    const lenFile = this.fileHeader.len_file;
    const lenData = data.length;
    if (lenFile !== lenData) {
      throw new BuildFileLengthError(this.fileHeader, lenFile);
    }

    return data;
  }

  save(path = "") {
    path = path || this._path;
    const data = this.build();
    fs.writeFileSync(path, data);
  }

  getTag(key) {
    return this.__getitem__(key)[0];
  }

  getAllTags(key) {
    return this.__getitem__(key);
  }

  get(key) {
    // console.log("get: ", this.__getitem__(key));
    return this.__getitem__(key)[0].get();
  }

  getAll(key) {
    return this.__getitem__(key).map((tag) => tag.get());
  }

  get length() {
    return this.keys.length;
  }

  [Symbol.iterator]() {
    return this.keys[Symbol.iterator]();
  }

  __getitem__(item) {
    console.log(`\n--- Get ${item} Tags ---`);
    if (item === item.toUpperCase() && item.length === 4) {
      return this.tags.filter((tag) => tag.struct.type === item);
    } else {
      return this.tags.filter((tag) => tag.struct.name === item);
    }
  }

  __contains__(item) {
    if (item === item.toUpperCase() && item.length === 4) {
      return this.tags.some((tag) => tag.type === item);
    } else {
      return this.tags.some((tag) => tag.name === item);
    }
  }

  toString() {
    return `${this.constructor.name}(${this.tagTypes})`;
  }

  setPath(path) {
    const tag = this.getTag("PPTH");
    tag.set(path);
  }
}

module.exports = { AnlzFile, BuildFileLengthError };
