import { binary8, hex4, hex8 } from "../engine/format.js";
import { MNEMONICS } from "../engine/constants.js";

/** RAM block: shows all sixteen eight-bit locations and the MAR access. */
export default function RamViewer({
  memory = Array(16).fill(0),
  accessedAddress = 0,
  pc,
}) {
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
              <th>Pointer</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 16 }, (_, address) => {
              const value = memory[address] || 0;
              const mnemonic = MNEMONICS[(value >> 4) & 0x0f];
              return (
                <tr
                  className={address === accessedAddress ? "row--accessed" : ""}
                  key={address}
                >
                  <th>{hex4(address)}</th>
                  <td>{binary8(value)}</td>
                  <td>{hex8(value)}</td>
                  <td>
                    {address === pc && <span className="pointer">PC</span>}
                    {address === accessedAddress && (
                      <span className="pointer pointer--mar"> MAR</span>
                    )}
                    {mnemonic && <span className="sr-only"> {mnemonic}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
