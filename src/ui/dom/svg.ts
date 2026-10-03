import { listen, setAttributes, type ElementProps } from "./h";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** `h` for SVG: the same props, but the element is made in the SVG namespace. */
export function svg<Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  props: ElementProps = {},
  ...children: readonly Node[]
): SVGElementTagNameMap[Tag] {
  const element = document.createElementNS(SVG_NAMESPACE, tag);

  if (props.class !== undefined) {
    // SVG elements have no `className` string to assign.
    element.setAttribute("class", props.class);
  }
  setAttributes(element, props.attrs ?? {});
  listen(element, props.on ?? {});
  element.append(...children);

  return element;
}
