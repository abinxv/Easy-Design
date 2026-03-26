# Easy-Design TODO

## Current Status

- [x] Landing page, navigation, and style showcase are built
- [x] User authentication works with register, login, session restore, and logout
- [x] Room catalog is available for bedroom, kitchen, living room, bathroom, and office
- [x] Analyze flow lets users choose a room and select furniture/decor items
- [x] Backend generates Pinterest inspiration links based on room + item selection
- [x] Logged-in users can save searches and view them in the dashboard
- [x] MongoDB is connected for user accounts and saved design history

## TODO

- [ ] Add real room image upload instead of only manual room/item selection
- [ ] Build actual AI/image-analysis support for uploaded room photos
- [ ] Turn recommendations into richer outputs: style, palette, furniture, and layout reasoning
- [ ] Let users reopen a saved design and view the full recommendation set again
- [ ] Improve loading, empty, and error states across analyze, auth, and dashboard pages

## Next Milestone

- [ ] Add upload UI on the analyze page
- [ ] Add backend file handling and image validation
- [ ] Extract useful room signals from an uploaded image
- [ ] Use those signals to generate smarter design suggestions
- [ ] Save image-based recommendation sessions in the database


## Features to add

- [ ] Budget-aware recommendations
- [ ] Compare multiple styles for the same room
- [ ] Favorites or saved collections for inspiration sets
- [ ] Shareable design links
- [ ] Simple admin/analytics view if needed later

