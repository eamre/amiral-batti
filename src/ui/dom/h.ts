type Child = Node | string;

type Listeners = {
  [Type in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[Type]) => void;
};

export interface ElementProps {
  readonly class?: string;
  /** `true` sets the attribute with no value (like `disabled`), `false` leaves it out. */
  readonly attrs?: Readonly<Record<string, string | boolean>>;
  readonly on?: Listeners;
}

/**
 * Builds an element. Text children become text nodes, so a player's name can never turn into markup.
 *
 *   h("button", { class: "button", on: { click: save } }, "Kaydet")
 */
export function h<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  props: ElementProps = {},
  ...children: readonly Child[]
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);

  if (props.class !== undefined) {
    element.className = props.class;
  }
  for (const [name, value] of Object.entries(props.attrs ?? {})) {
    if (value !== false) {
      element.setAttribute(name, value === true ? "" : value);
    }
  }
  listen(element, props.on ?? {});
  element.append(...children);

  return element;
}

function listen(element: HTMLElement, listeners: Listeners): void {
  for (const [type, listener] of Object.entries(listeners)) {
    // `Object.entries` forgets which event goes with which listener; the `Listeners` type has already checked it.
    element.addEventListener(type, listener as EventListener);
  }
}
