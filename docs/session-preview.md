# Viewing an astronomy session

Open Camera while the selected telescope is capturing. The workspace switches
automatically to the telescope's session image, with captured and stacked frame
counts. Images update when the device publishes them; long exposures and
stacking can leave the same image visible for a while. Go Live is not required.

The session image uses the device's JPEG preview. It is not a downloaded FITS
exposure, and Dwarfium does not reproduce the DWARFLAB app's display curves.
The telescope decides which session image to publish. Separate selectable
single-frame and stack channels are not offered.

Telephoto and wide-angle captures use separate streams and counters. Switching
fleet devices or reconnecting clears the previous device's preview. If an image
connection fails, Retry session image reconnects the viewer without restarting
capture. Leaving Camera closes its image connections, while the fleet command
connection stays open. Completed images remain available under Sessions.

Validated with a short live DWARF 3 capture, alongside software checks for
camera isolation, reconnects, new capture identities and proxy cancellation.
Mini and DWARF II were not live-tested for this change.

## Version 3.1.11

- Automatic session images replace the framing feed during capture; captured
  and stacked counts remain separate when the firmware updates them separately.
- Image connections close when the viewer leaves, including through the desktop
  and standalone proxy. The fleet command connection remains independent.
- The Next.js API proxy preserves large firmware parameter IDs without rounding,
  matching the desktop and standalone proxy behavior.
- Camera controls wrap on narrow screens, the capture toolbar stays below the
  image, and internal stream URLs are no longer displayed.

The Windows installer must be rebuilt to include these changes. Updating source
does not change an already installed application.
