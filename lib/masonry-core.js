// Masonry column assignment identical to the Masonry library used by the
// original theme: every item goes into the currently shortest column (ties go
// to the leftmost one). Shared by the importer (build time) and the browser.
//
// ratios: image height / width for every item, in DOM order
// colWidth: outer width of one column in px, gap: padding around each image in px
/**
 * @param {number[]} ratios
 * @param {number} columns
 * @param {number} colWidth
 * @param {number} gap
 * @returns {number[]}
 */
export function assignColumns(ratios, columns, colWidth, gap) {
  const heights = new Array(columns).fill(0);
  const assignment = [];
  for (const r of ratios) {
    let col = 0;
    for (let c = 1; c < columns; c++) if (heights[c] < heights[col] - 0.01) col = c;
    assignment.push(col);
    heights[col] += (colWidth - 2 * gap) * r + 2 * gap;
  }
  return assignment;
}
