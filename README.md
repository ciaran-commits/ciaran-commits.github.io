# Ciaran Pratley: Portfolio

**Live site:** https://ciaran-commits.github.io

Everything you'll ever edit is in the **`content`** folder. When you send changes to GitHub, the site rebuilds itself and goes live in about two minutes. The `theme` folder holds the design and layout; you don't need to touch it.

```
content/
├── home.md                     your name, contact links and home page headline
├── about.md                    the About page
├── CiaranPratleyResume.pdf     the Resume link
└── projects/
    └── humidity-house/         one folder per project
        ├── project.md          the words for this project
        └── images/             its photos and videos
```

---

## Add a new project

1. **Copy an existing project folder** (for example `name-tag`) and rename it. Use lowercase with dashes, like `desk-lamp`. The folder name becomes the page address: `ciaran-commits.github.io/projects/desk-lamp/`.
2. **Swap the photos** in its `images` folder for your own. Use JPG or PNG (not HEIC), and file names without spaces, like `lamp-front.jpg`. Full-size phone photos are fine: the site shrinks them automatically.
3. **Edit `project.md`** (see below).
4. **Publish** (see the end of this guide).

## Edit a project

Open its `project.md` in any text editor. The top section, between the `---` lines, holds the project details. Keep the quote marks around each value.

```yaml
---
title: "Desk Lamp"
client: "Formlabs"              # optional: delete the line if there isn't one
year: "2026"
role: "Product design, CAD"
tools: "Onshape, 3D printing"
summary: "One sentence shown under the title."
cover: "images/lamp-front.jpg"  # photo on the home page and at the top of the project page
order: 1                        # position on the home page (1 = first)
---
```

Optional extra lines:

- `timeline: "January – April 2026"` shows on the project page instead of the year.
- `outcome: "Published on the Formlabs support site"` adds an Outcome item next to Role and Tools.
- `hero: "images/lineup.jpg"` uses a different photo at the top of the project page, while `cover` stays the home page thumbnail.
- `draft: true` hides the project without deleting it.

Below the top section, write the page in plain text:

```markdown
## Process                                  ← a section heading

A paragraph of text. Leave a blank line between paragraphs.

![First prototype](images/prototype.jpg)   ← a photo; the words in [ ] become its caption

![Front](images/lamp-front.jpg)             ← photos on back-to-back lines
![Side](images/lamp-side.jpg)               ← sit side by side in one row

![](images/detail.jpg)                      ← empty [ ] means no caption
![Lamp turning on](images/demo.mp4)         ← videos (MP4) work the same way
```

If you don't place any photos in the text, every photo in the `images` folder is shown automatically.

## Edit the home page, About page or resume

- **Headline:** the first paragraph in `content/home.md`. Your email and LinkedIn are at the top of the same file.
- **About page:** `content/about.md`. To add a photo of yourself, put it in the `content` folder and write its name on the `photo:` line, for example `photo: "me.jpg"`.
- **Resume:** replace `CiaranPratleyResume.pdf` with your new version, keeping the same file name.

## Publish your changes

**On your computer, with VS Code (recommended)**

1. In VS Code, choose **File → Open Folder** and open `Documents/Portfolio/website`.
2. Make your edits and save.
3. Click the **Source Control** icon in the left sidebar (it looks like a branch). Type a short note such as `Add desk lamp project`, click **Commit** (if asked about staging changes, choose **Yes**), then click **Sync Changes**.
   The first time, a browser window will ask you to sign in to GitHub.
4. Wait about two minutes, then refresh the live site.

**On github.com, from any computer**

Go to [github.com/ciaran-commits/ciaran-commits.github.io](https://github.com/ciaran-commits/ciaran-commits.github.io) and open the file you want. Click the pencil icon to edit, then **Commit changes**. To add photos, open a project's `images` folder and choose **Add file → Upload files**.
If you edit this way, click **Sync Changes** in VS Code before you next edit on your computer, so both copies match.

## If something goes wrong

- **The change isn't showing:** wait a few minutes and refresh. Then open the **Actions** tab on GitHub. A green tick means the site was published. A red cross means something needs fixing; click it to see what. The usual cause is a missing quote mark in the top section of a `.md` file. The live site stays as it was until the problem is fixed.
- **A photo is missing:** check the file name in `project.md` matches exactly, including capitals and `.jpg` vs `.jpeg`.
- **Undo a change:** GitHub keeps every version. Open any file on github.com and click **History**.

## Good to know

- Photos straight from a phone can contain the location where they were taken. The site strips this from the photos visitors see, but the original files stored on GitHub keep it. To remove it on Windows, right-click the photo, choose **Properties → Details → Remove Properties and Personal Information**.
- **Preview on your own computer (optional):** in a terminal inside the `website` folder, run `npm install` once, then `npm start`, and open http://localhost:8080.
