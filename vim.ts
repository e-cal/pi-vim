import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { matchesKey } from "@earendil-works/pi-tui";
import installVim from "./index.js";

export default async function (pi: ExtensionAPI) {

  // Keep upstream initialization and cleanup; customize only the editor it installs.
  const wrapped = new Proxy(pi, {
    get(target, key) {
      if (key !== "on") return Reflect.get(target, key);
      return (event: string, handler: (event: unknown, ctx: ExtensionContext) => unknown) => {
        if (event !== "session_start") return target.on(event as never, handler as never);
        return target.on("session_start", (event, ctx) => {
          const ui = new Proxy(ctx.ui, {
            get(target, key) {
              if (key !== "setEditorComponent") return Reflect.get(target, key);
              return (factory: Parameters<typeof target.setEditorComponent>[0]) => target.setEditorComponent(
                factory && ((tui, theme, kb) => {
                  const editor = factory(tui, theme, kb);
                  // pi-vim 0.14.2 has no public label-visibility setting.
                  const modal = editor as typeof editor & { getModeLabel(): string; getMode(): string };
                  const label = modal.getModeLabel.bind(modal);
                  modal.getModeLabel = () => label().startsWith(" EX ") ? label() : "";
                  const publish = () => pi.events.emit("dotfiles:vim-mode", { mode: modal.getMode() });
                  const handleInput = editor.handleInput.bind(editor);
                  editor.handleInput = (data) => {
                    if (modal.getMode() === "insert") {
                      if (matchesKey(data, "ctrl+enter") || matchesKey(data, "super+enter")) {
                        handleInput("\r");
                      } else {
                        // Preserve Vim's newline recording for plain Enter.
                        handleInput(matchesKey(data, "enter") ? "\n" : data);
                      }
                    } else {
                      handleInput(data);
                    }
                    publish();
                  };
                  publish();
                  return editor;
                }),
              );
            },
          });
          return handler(event, { ...ctx, ui }) as never;
        });
      };
    },
  });
  await installVim(wrapped);
}
