export const timelineLayout = {
  listPaddingX: 16,
  timeColumnWidth: 64,
  columnGap: 12,
  dotColumnWidth: 18,
  lineWidth: 2,
}

export const timelineLineLeft =
  timelineLayout.listPaddingX +
  timelineLayout.timeColumnWidth +
  timelineLayout.columnGap +
  timelineLayout.dotColumnWidth / 2 -
  timelineLayout.lineWidth / 2

export const timelineSelectionWidth =
  timelineLayout.timeColumnWidth + timelineLayout.columnGap + timelineLayout.dotColumnWidth
