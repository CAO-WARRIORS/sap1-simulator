import { binary8, binary4, hex8, hex4 } from "../engine/format.js";

/** @param {{ name:string, value:number, width?:4|8, changed?:boolean }} props */
export default function RegisterPanel({
  name,
  value,
  width = 8,
  changed = false,
}) {
  const binary = width === 4 ? binary4(value) : binary8(value);
  const hex = width === 4 ? hex4(value) : hex8(value);
  return (
    <article
      className={`register ${changed ? "register--changed" : ""}`}
      aria-label={`${name} register`}
    >
      <div className="register__name">{name}</div>
      <strong>{binary}</strong>
      <span>{hex}</span>
    </article>
  );
}
