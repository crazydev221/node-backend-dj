# Rekordbox DJ Export System 

[![Tests][tests-badge]][tests-link]
[![Codecov][codecov-badge]][codecov-link]
[![license: MIT][license-badge]][license-link]
[![style: ruff][ruff-badge]][ruff-link]

Rekordbox DJ Export System is a Node.js application designed to analyze DAT and EXT files from tracks in Pioneer Rekordbox DJ Software. It also facilitates the export of DAT and EXT files from XML data generated by the Rekordbox DJ Software.

Rekordbox DJ Export System is a Node.js application for interacting with the library and export data of Pioneers Rekordbox DJ Software.
It currently supports

- Analysis files (.DAT or .EXT)
- My-Setting files
- Rekordbox XML database importing

Tested Rekordbox versions: `5.8.6 | 6.5.3 | 6.7.7`

## 🔧 Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/crazydev221/node-backend-dj.git
   cd node-backend-dj
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## 🚀 Quick-Start

[Read the full documentation on ReadTheDocs!][documentation]

| ❗  | Please make sure to back up your Rekordbox collection before making changes with pyrekordbox or developing/testing new features. The backup dialog can be found under "File" > "Library" > "Backup Library" |
| --- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

**1. Analyze DAT and EXT files:**

Rekordbox stores analysis information of the tracks in the collection in specific files, which also get exported to decives used by Pioneer professional DJ equipment. The files have names like ANLZ0000 and come with the extensions .DAT, .EXT or .2EX. They include waveforms, beat grids (information about the precise time at which each beat occurs), time indices to allow efficient seeking to specific positions inside variable bit-rate audio streams, and lists of memory cues and loop points.

Rekordbox DJ Export System can parse all three analysis files, although not all the information of the tracks can be extracted yet.

You can analyze the exported DAT and EXT data like this :

```javascript
const { AnlzFile } = require("./anlz/File");

const parse_file_path = "./path/to/your/ANLZ0000.DAT";

const analyzer = AnlzFile.parseFile(parse_file_path);
const pathTags = analyzer.getAllTags("path");
console.log("Path Tags:");
console.log(pathTags);
```

The DAT or EXT file specified by the parse_file_path value is then parsed by the parser and the result will be printed.

**2. Analyze Setting files:**

You can also use an API called "readMySettingFile" to quickly start analyzing your settings file.

```javascript
const { readMySettingFile } = require("./mysettings/File");

const filePath = "./testfiles/export/PIONEER/MYSETTING.DAT";
const mySettingData = readMySettingFile(filePath);

if (mySettingData) {
  const sync = mySettingData.get("sync");
  const quant = mySettingData.get("quantize");

  console.log("Sync:", sync);
  console.log("Quant:", quant);
}
```

It then reads and analyzes the settings file in the path specified by the filePath value.

**3. Export DAT and EXT files from XML data:**

The Rekordbox XML database is used for importing (and exporting) Rekordbox collections including track metadata and playlists. They can also be used to share playlists between two databases.

Rekordbox DJ Export System can read Rekordbox XML databases to get the infomation of the track and export the DAT and EXT file with it.

The Rekordbox DJ Export System implement the exporting API like ./xml/readxml.js file :

```javascript
const fs = require("fs");
const xml2js = require("xml2js");
const { writeFromParsedData } = require("./writeDAT");

function exportFromXML(xmlFilePath, usbDrive) {
  fs.readFile(xmlFilePath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error reading XML file:", err);
      return;
    }

    // Parse XML to JavaScript object
    try {
      xml2js.parseString(data, (parseErr, result) => {
        if (parseErr) {
          console.error("Error parsing XML:", parseErr);
          return;
        }
        // Now, 'result' contains the parsed XML as a JavaScript object
        writeFromParsedData(result, usbDrive);
      });
    } catch (e) {
      console.log(e);
    }
  });
}

module.exports = { exportFromXML };
```

So, if you want to export the DAT and EXT file from the XML Database, you should run the code like this:

```javascript
const exportFromXML = require("./xml/readXML");

const xml_path = "./path/to/your/rekordbox.xml";
cosnt usb_drive = "H";
exportFromXML(xml_path, usb_drive);
```

The first parameter is the path to the xml file, and the second parameter is a value that specifies the USB drive.
The test xml file pathed by xml_path is then analyzed and the DAT, EXT files are exported in outputs directory.

## 💡 File formats

A summary of the Rekordbox file formats can be found in the [documentation]:

- [Rekordbox XML format][xml-doc]
- [ANLZ file format][anlz-doc]
- [My-Setting file format][mysettings-doc]
- [Rekordbox 6 database][db6-doc]

## 💻 Development

If you encounter an issue or want to contribute to pyrekordbox, please feel free to get in touch,
[open an issue][new-issue] or create a new pull request! A guide for contributing to
`Rekordbox DJ Export System` and the commit-message style can be found in
[CONTRIBUTING].

For general questions or discussions about Rekordbox, please use [GitHub Discussions][discussions]
instead of opening an issue.

Pyrekordbox is tested on Windows and MacOS, however some features can't be tested in
the CI setup since it requires a working Rekordbox installation.

## 🔗 Related Projects and References

- [crate-digger]: Java library for fetching and parsing rekordbox exports and track analysis files.
- [rekordcrate]: Library for parsing Pioneer Rekordbox device exports
- [supbox]: Get the currently playing track from Rekordbox v6 as Audio Hijack Shoutcast/Icecast metadata, display in your OBS video broadcast or export as JSON.
- Deep Symmetry has an extensive analysis of Rekordbox's ANLZ and .edb export file formats
  https://djl-analysis.deepsymmetry.org/djl-analysis
- rekordcrate reverse engineered the format of the Rekordbox MySetting files
  https://holzhaus.github.io/rekordcrate/rekordcrate/setting/index.html
- rekordcloud went into detail about the internals of Rekordbox 6
  https://rekord.cloud/blog/technical-inspection-of-rekordbox-6-and-its-new-internals.
- supbox has a nice implementation on finding the Rekordbox 6 database key
  https://github.com/gabek/supbox

## Code Style:

Follow the [JavaScript Standard Style](https://standardjs.com/) for consistent and clean code.

[tests-badge]: https://img.shields.io/github/actions/workflow/status/dylanljones/pyrekordbox/tests.yml?branch=master&label=tests&logo=github&style=flat
[docs-badge]: https://img.shields.io/readthedocs/pyrekordbox/stable?style=flat
[platform-badge]: https://img.shields.io/badge/platform-win%20%7C%20osx-blue?style=flat
[license-badge]: https://img.shields.io/pypi/l/pyrekordbox?color=lightgrey
[black-badge]: https://img.shields.io/badge/code%20style-black-000000?style=flat
[ruff-badge]: https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/astral-sh/ruff/main/assets/badge/v2.json
[codecov-badge]: https://codecov.io/gh/dylanljones/pyrekordbox/branch/master/graph/badge.svg?token=5Z2KVGL7N3
[license-link]: https://github.com/dylanljones/pyrekordbox/blob/master/LICENSE
[tests-link]: https://github.com/dylanljones/pyrekordbox/actions/workflows/tests.yml
[black-link]: https://github.com/psf/black
[ruff-link]: https://github.com/astral-sh/ruff
[lgtm-link]: https://lgtm.com/projects/g/dylanljones/pyrekordbox/context:python
[codecov-link]: https://app.codecov.io/gh/dylanljones/pyrekordbox/tree/master
[codecov-dev-link]: https://app.codecov.io/gh/dylanljones/pyrekordbox/tree/dev
[docs-latest-badge]: https://img.shields.io/readthedocs/pyrekordbox/latest?logo=readthedocs&style=flat
[docs-dev-badge]: https://img.shields.io/readthedocs/pyrekordbox/dev?logo=readthedocs&style=flat
[documentation]: https://pyrekordbox.readthedocs.io/en/stable/
[documentation-latest]: https://pyrekordbox.readthedocs.io/en/latest/
[documentation-dev]: https://pyrekordbox.readthedocs.io/en/dev/
[tutorial]: https://pyrekordbox.readthedocs.io/en/stable/tutorial/index.html
[db6-doc]: https://pyrekordbox.readthedocs.io/en/stable/formats/db6.html
[anlz-doc]: https://pyrekordbox.readthedocs.io/en/stable/formats/anlz.html
[xml-doc]: https://pyrekordbox.readthedocs.io/en/stable/formats/xml.html
[mysettings-doc]: https://pyrekordbox.readthedocs.io/en/stable/formats/mysetting.html
[new-issue]: https://github.com/dylanljones/pyrekordbox/issues/new/choose
[discussions]: https://github.com/dylanljones/pyrekordbox/discussions
[CONTRIBUTING]: https://github.com/dylanljones/pyrekordbox/blob/master/CONTRIBUTING.md
[CHANGELOG]: https://github.com/dylanljones/pyrekordbox/blob/master/CHANGELOG.md
[installation]: https://pyrekordbox.readthedocs.io/en/latest/installation.html
[rekordcrate]: https://github.com/Holzhaus/rekordcrate
[crate-digger]: https://github.com/Deep-Symmetry/crate-digger
[supbox]: https://github.com/gabek/supbox
