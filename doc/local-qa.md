# Local wrapped-navigation fork

Based on upstream `v0.14.2`, branch `ecal/wrapped-line-navigation`. Pi loads `~/projects/pi-vim` from the dotfiles package configuration. This is a local fork; no GitHub fork or remote push has been created.

## Manual verification

- Restart Pi or run `/reload`, draft a paragraph long enough to wrap, press Escape, and verify `j`/`k` move within that paragraph instead of jumping over it.
- Try `2j`, `2k`, `gj`, and `gk`; verify movement stops at the first/last screen line without entering prompt history or jumping to the line end.
- Resize the terminal and repeat; check Unicode text, narrow widths, and nonzero editor padding.
- Verify `dj`/`yk` still operate over logical lines, visual `j`/`k` still use logical lines, and insert-mode `j`/`k` still type text.
- Verify movement in both regular and fullscreen Pi modes.

## Validation

Lint, typechecking, seven focused wrapped-navigation tests, and existing line-motion Neovim parity cases pass against the installed Pi 1.0.4 runtime. The full suite has one upstream cursor-marker assertion failure, reproduced on unmodified `v0.14.2`; scoreboard generation refuses to publish while that baseline failure exists. Development-only peer-package symlinks in `node_modules` point at the installed Pi runtime to check the actual target version; they are not tracked or required by Pi's extension loader.

Counted movement builds Pi's visual-line map once and clamps the destination, rather than replaying arrow inputs. A local timing check on a 2,000-character logical line at 80 content columns took about 76 ms for 100 `gg20j` operations (including reset and key dispatch). The initial arrow-loop implementation took over 30 seconds for 7,000 operations and was discarded. Logical-line navigation upstream is naturally cheaper because it does not compute wrapping.
