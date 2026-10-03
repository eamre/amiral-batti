type Child = Node | string;

export type Attributes = Readonly<Record<string, string | number | boolean>>;

export type Listeners = {
  [Type in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[Type]) => void;
};

export interface ElementProps {
  readonly class?: string;
  /** `true` sets the attribute with no value (like `disabled`), `false` leaves it out. */
  readonly attrs?: Attributes;
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
  setAttributes(element, props.attrs ?? {});
  listen(element, props.on ?? {});
  element.append(...children);

  return element;
}

export function setAttributes(element: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== false) {
      element.setAttribute(name, value === true ? "" : String(value));
    }
  }
}

export function listen(element: Element, listeners: Listeners): void {
  for (const [type, listener] of Object.entries(listeners)) {
    // `Object.entries` forgets which event goes with which listener; the `Listeners` type has already checked it.
    element.addEventListener(type, listener as EventListener);
  }
}
