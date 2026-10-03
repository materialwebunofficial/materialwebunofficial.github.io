# Selection-control source reference

AndroidX revision a095da93f8e98dea8748ceed79ea8427aade245f, Apache-2.0.
Original notices are retained in each source file. sources.json records URLs/hashes.

The default Checkbox path has isCheckboxStylingFixEnabled=false. Its canvas is
20dp (not the newer token's18dp), with square-cap2dp marks at (4,10),(8,14),(16,6).
Disabled box alpha is .38 independently of the still-opaque onPrimary checkmark.
The newer disabled Surface mark and18dp geometry belong to the inactive branch.
Radio's token canvas is20dp; source dot radius6dp minus half the2dp stroke yields
an actual10dp dot. Radio dot motion selects FastSpatial. Switch thumb motion
also selects FastSpatial; disabled colors composite over surface, not transparent.

Browser tests cover static geometry, interaction, form ownership/reset/restore,
keyboard grouping and RTL. Full checkmark morph/retraction and radio's interpolated
radius subtraction, ripple phase curves, precision-pointer focus rings and
cross-browser parity remain under audit; these fixtures do not prove those yet.
