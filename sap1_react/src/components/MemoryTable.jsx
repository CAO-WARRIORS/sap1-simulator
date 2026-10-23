import { binary8, hex4, hex8 } from "../engine/format.js";
import { mnemonic } from "../engine/sap1.js";

/** @param {{ memory:number[], pc:number, mar:number }} props */
export default function MemoryTable({ memory, pc, mar }) {
  return (
    <section className="panel memory-panel">
      <div className="section-heading">
        <span>03</span>
        <h2>RAM / 16 x 8</h2>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Sixteen SAP-1 memory addresses</caption>
          <thead>
            <tr>
              <th>Address</th>
              <th>Binary</th>
              <th>Hex</th>
              <th>Decoded</th>
              <th>Pointer</th>
            </tr>
          </thead>
          <tbody>
            {memory.map((value, address) => (
              <tr
                className={address === mar ? "row--accessed" : ""}
                key={`address-${address}`}
              >
                <th>{hex4(address)}</th>
                <td>{binary8(value)}</td>
                <td>{hex8(value)}</td>
                <td>
                  {mnemonic(value)}
                  {[0, 1, 2].includes(value >> 4)
                    ? ` ${hex4(value & 0xf)}`
                    : ""}
                </td>
                <td>
                  {address === pc ? (
                    <span className="pointer">PC</span>
                  ) : address === mar ? (
                    <span className="pointer pointer--mar">MAR</span>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
