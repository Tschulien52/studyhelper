# Safari Web Extension wrapper

This directory is generated with Apple’s `safari-web-extension-converter`; it is not a second hand-maintained extension implementation.

```sh
npm run build:safari
npm run safari:project
```

Open the generated `Angry Study Helper/Angry Study Helper.xcodeproj` in Xcode, select the macOS app target, configure your signing team, and build/run it. Safari’s Develop menu can then enable the extension.

The canonical source remains `src/`. `dist/safari/` is generated from that source, with only the Safari manifest form and classic background-worker bundle differing from Chrome. The converter copies the generated Web Extension into the Xcode wrapper because that is how Apple’s tool creates a self-contained app extension.

The current Xcode project is intentionally macOS-only. Safari support depends on the installed Xcode/Safari SDK; the converter may report warnings for manifest keys unsupported by older SDKs. In particular, the Safari build omits Chrome’s `background.type` and bundles the same background modules into a classic worker. Safari’s tab-event behavior around a newly created blank tab should still be verified on the target macOS version.
