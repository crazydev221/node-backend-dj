### Settings ###

# from pyrekordbox.mysettings import read_mysetting_file

# mysett = read_mysetting_file("./testfiles/export/PIONEER/MYSETTING.DAT")
# sync = mysett.get("sync")
# quant = mysett.get("quantize")
# print("Sync: ", sync)
# print("Quant: ", quant)

### Analyze ###
# import pyrekordbox

# anlyzer = pyrekordbox.AnlzFile.parse_file(
#     "./testfiles/export/PIONEER/USBANLZ/P05F/000187DD/ANLZ0000.DAT"
# )
# print("--- Anlz Tags --- \n", anlyzer.tags)

# print("Beat Grid:")
# beat_grid = anlyzer.get("PQTZ")
# print(beat_grid)

# print("Extened Cue list Tags:")
# cue_tag = anlyzer.getall_tags("cue_list")
# print("cue_tag", cue_tag)
# for cue in cue_tag:
#     print(cue.content)

# print("Path Grid Tags:")
# path_tag = anlyzer.getall_tags("path")
# for path in path_tag:
#     print(path.content.path)

### XML parse ###
# from pyrekordbox.xml import RekordboxXml

# xml = RekordboxXml("rekordbox.xml")

# track = xml.get_track(0)  # Get track by index (or TrackID)

# track_id = track.TrackID  # Access via attribute
# name = track["Name"]  # or dictionary syntax

# path = "1.mp3"
# track = xml.add_track(path)  # Add new track
# track["Name"] = "Title"  # Add attributes to new track
# track["TrackID"] = 10  # Types are handled automatically


# # Get playlist (folder) by path
# pl = xml.get_playlist("Folder", "Sub Playlist")
# keys = pl.get_tracks()  # Get keys of tracks in playlist
# ktype = pl.key_type  # Key can either be TrackID or Location

# # Add tracks and sub-playlists (folders)
# pl.add_track(track.TrackID)
# pl.add_playlist("Sub Sub Playlist")

### Database ###
from pyrekordbox import Rekordbox6Database

db = Rekordbox6Database()

for content in db.get_content():
    print(content.Title, content.Artist.Name)

playlist = db.get_playlist()[0]
for song in playlist.Songs:
    content = song.Content
    print(content.Title, content.Artist.Name)

# content = db.get_content()[0]
# content.Title = "New Title"
