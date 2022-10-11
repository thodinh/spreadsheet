import { range, toXC, toZone, zoneToDimension } from "../../helpers";
import { ExcelFilterTableData, ExcelSheetData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { NAMESPACE } from "../constants";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";

export function createTable(
  table: ExcelFilterTableData,
  tableId: number,
  sheetData: ExcelSheetData
): XMLDocument {
  const tableAttributes: XMLAttributes = [
    ["id", tableId],
    ["name", `Table${tableId}`],
    ["displayName", `Table${tableId}`],
    ["ref", table.range],
    ["xmlns", NAMESPACE.table],
    ["xmlns:xr", NAMESPACE.revision],
    ["xmlns:xr3", NAMESPACE.revision3],
    ["xmlns:mc", NAMESPACE.markupCompatibility],
  ];

  const xml = escapeXml/*xml*/ `
    <table ${formatAttributes(tableAttributes)}>
      ${addAutoFilter(table)}
      ${addTableColumns(table, sheetData)}
    </table>
    `;
  return parseXML(xml);
}

function addAutoFilter(table: ExcelFilterTableData): XMLString {
  const autoFilterAttributes: XMLAttributes = [["ref", table.range]];
  return escapeXml/*xml*/ `<autoFilter ${formatAttributes(autoFilterAttributes)} />`;
}

function addTableColumns(table: ExcelFilterTableData, sheetData: ExcelSheetData): XMLString {
  const tableZone = toZone(table.range);
  const columns: XMLString[] = [];
  for (const i of range(0, zoneToDimension(tableZone).width)) {
    const colHeaderXc = toXC(tableZone.left + i, tableZone.top);
    const colName = sheetData.cells[colHeaderXc]?.content || `col${i}`;
    const colAttributes: XMLAttributes = [
      ["id", i + 1],
      ["name", colName],
    ];
    columns.push(escapeXml/*xml*/ `<tableColumn ${formatAttributes(colAttributes)}/>`);
  }

  return escapeXml/*xml*/ `
        <tableColumns ${formatAttributes([["count", columns.length]])}>
            ${joinXmlNodes(columns)}
        </tableColumns>
    `;
}
