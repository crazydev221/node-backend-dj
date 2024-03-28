const { AnlzFile } = require("./anlz/File");

try {
  const analyzer = AnlzFile.parseFile(
    "H:/PIONEER/USBANLZ/P004/00025850/ANLZ0000.DAT"
  );

  // console.log("Tags : ", analyzer.tags);

  path_tags = analyzer.getAllTags("path");
  console.log("Path Tags:");
  console.log(JSON.stringify(path_tags, null, 2)); // JSON.stringify(path_tags, null, 2)

  // beat_grid = analyzer.getAllTags("beat_grid2");
  // console.log("Beat Grid:");
  // console.log(beat_grid[0].struct.content); // JSON.stringify(beat_grid, null, 2) // beat_grid[0].struct.content

  // extented_path_tag = analyzer.getAllTags("PQT2");
  // console.log(extented_path_tag); // JSON.stringify(extented_path_tag, null, 2)

  // cue_tags = analyzer.getAllTags("cue_list");
  // console.log("Cue List Tags", JSON.stringify(cue_tags, null, 2));

  // extended_cue_tags = analyzer.getAllTags("cue_list2"); // cue_list
  // console.log("Extended Cue List Tags");
  // console.log(JSON.stringify(extended_cue_tags, null, 2));

  // vbr_tag = analyzer.getAllTags("PVBR");
  // console.log("PVBR Tags");
  // console.log(JSON.stringify(vbr_tag, null, 2));

  // wf_tag = analyzer.getAllTags("wf_preview");
  // console.log("Waveform Preview Tags:");
  // console.log(JSON.stringify(wf_tag, null, 2));

  // twf_tag = analyzer.getAllTags("wf_tiny_preview");
  // console.log("Tiny Waveform Preview Tags:");
  // console.log(JSON.stringify(twf_tag, null, 2));

  // wf_detail_tags = analyzer.getAllTags("wf_detail");
  // console.log("Waveform Detail Tag:");
  // console.log(wf_detail_tags[0].struct); // JSON.stringify(wf_detail_tags, null, 2)

  // wf_color = analyzer.getAllTags("wf_color");
  // console.log("Waveform Color Preview Tag:");
  // console.log(wf_color[0].struct.content)

  // wf_color_detial = analyzer.getAllTags("wf_color_detail");
  // console.log("Waveform Color Detail Tags");
  // console.log(wf_color_detial[0].struct); // JSON.stringify(wf_color_detial, null, 2)
  // }

  // structure = analyzer.getAllTags("structure");
  // console.log("Song Structure Tag:");
  // console.log(JSON.stringify(structure, null, 2));

  // pwv6 = analyzer.getAllTags("PWV6");
  // console.log("PWV6 Tag:");
  // console.log(JSON.stringify(pwv6, null, 2));

  // pwv7 = analyzer.getAllTags("PWV7 ");
  // console.log("PWV7  Tag:");
  // console.log(JSON.stringify(pwv7, null, 2));

  // pwvc = analyzer.getAllTags("PWVC");
  // console.log("PWVC Tag:");
  // console.log(JSON.stringify(pwvc, null, 2));
} catch (error) {
  console.log(error);
}

// "./testfiles/export/PIONEER/USBANLZ/P05F/000187DD/ANLZ0000.EXT" // no song
// "./testfiles/export/PIONEER/USBANLZ/P016/0000875E/ANLZ0000.EXT"
// "./testfiles/export/PIONEER/USBANLZ/P017/00009B77/ANLZ0000.EXT" // no song
// "./testfiles/export/PIONEER/USBANLZ/P019/00020AA9/ANLZ0000.EXT" // no song
// "./testfiles/export/PIONEER/USBANLZ/P021/00006D2B/ANLZ0000.EXT" // no song
// "./testfiles/export/PIONEER/USBANLZ/P043/00011517/ANLZ0000.EXT" // no song
// "./testfiles/export/PIONEER/USBANLZ/P053/0001D21F/ANLZ0000.EXT"

// "./xml/output_0.EXT"
// "./xml/test.DAT"

// "H:/PIONEER/USBANLZ/P004/00025850/ANLZ0000.DAT"
// "H:/PIONEER/USBANLZ/P006/00028C4C/ANLZ0000.DAT"
// "H:/PIONEER/USBANLZ/P034/0000AA60/ANLZ0000(all).EXT" // 2.mp3
// "H:/PIONEER/USBANLZ/P044/0001D940/ANLZ0000.EXT" // 1.mp3
// "H:/PIONEER/USBANLZ/P009/000258BB/ANLZ0000-1.EXT" // 3.mp3
// "H:/PIONEER/USBANLZ/P057/00010A47/ANLZ0000.EXT" // 4.mp3
// "H:/PIONEER/USBANLZ/P016/0000875E/ANLZ0000.EXT" // 5.mp3
