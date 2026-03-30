/**
 * 전투 유닛 균등 배치 계산 (순수 함수)
 *
 * 열(column)별로 유닛을 space-evenly 방식으로 Y축 균등 배치.
 * 전투 화면, 편성 미리보기 등에서 재사용 가능.
 */

export interface UnitPosition {
  unitId: string;
  x: number;
  y: number;
}

export interface RowLayoutConfig {
  xMin: number;
  xMax: number;
  rowY: number;
  maxSlots: number;
}

export interface LayoutConfig {
  columns: Record<string, number>; // groupKey → colX
  yMin: number;
  yMax: number;
}

/**
 * 단일 열 내 유닛들의 균등 배치 좌표 계산
 *
 * N개 유닛을 [yMin, yMax] 범위에 space-evenly 배치:
 * position[i] = yMin + (i + 1) * (yMax - yMin) / (N + 1)
 */
export function calculateColumnLayout(unitIds: string[], colX: number, yMin: number, yMax: number): UnitPosition[] {
  const n = unitIds.length;
  if (n === 0) return [];

  const range = yMax - yMin;

  return unitIds.map((id, i) => ({
    unitId: id,
    x: colX,
    y: yMin + ((i + 1) * range) / (n + 1),
  }));
}

/**
 * 단일 행 내 유닛들의 균등 배치 좌표 계산
 *
 * 최대 슬롯 수 기준으로 고정 간격을 유지해 좌우로 정렬한다.
 * 현재 유닛 수가 maxSlots보다 적어도 전체 슬롯 폭 안에서 중앙 정렬된다.
 */
export function calculateRowLayout(unitIds: string[], config: RowLayoutConfig): UnitPosition[] {
  const n = unitIds.length;
  if (n === 0) return [];

  const slots = Math.max(n, config.maxSlots);
  const step = slots === 1 ? 0 : (config.xMax - config.xMin) / (slots - 1);
  const occupiedWidth = step * Math.max(n - 1, 0);
  const startX = (config.xMin + config.xMax - occupiedWidth) / 2;

  return unitIds.map((id, index) => ({
    unitId: id,
    x: startX + step * index,
    y: config.rowY,
  }));
}

/**
 * 전체 전투 유닛의 배치 좌표를 한번에 계산
 *
 * units를 team_position 그룹으로 분류 → 각 그룹을 열별 균등 배치
 */
export function calculateBattleLayout(
  units: Array<{ id: string; team: string; position: string; isAlive: boolean }>,
  config: LayoutConfig,
): UnitPosition[] {
  // 그룹별로 생존 유닛 분류
  const groups: Record<string, string[]> = {};

  for (const unit of units) {
    if (!unit.isAlive) continue;
    const key = `${unit.team}_${unit.position}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(unit.id);
  }

  const result: UnitPosition[] = [];

  for (const [groupKey, unitIds] of Object.entries(groups)) {
    const colX = config.columns[groupKey];
    if (colX == null) continue;

    const positions = calculateColumnLayout(unitIds, colX, config.yMin, config.yMax);
    result.push(...positions);
  }

  return result;
}
