import { ArrowDownOutlined, ArrowUpOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, InputNumber, Modal, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { isValidElement, useMemo, useState } from 'react';

type ColumnKey = string;
type ColumnWidths = Record<ColumnKey, number>;
type ColumnPreference = {
  order: ColumnKey[];
  visible: ColumnKey[];
  widths: ColumnWidths;
};
type ColumnDefinition<T extends object> = {
  key: ColumnKey;
  title: string;
  column: ColumnsType<T>[number];
  defaultVisible: boolean;
  defaultWidth: number;
};
type ColumnSettings<T extends object> = {
  columns: ColumnsType<T>;
  scrollX: number;
  button: React.ReactNode;
};

const minColumnWidth = 72;
const maxColumnWidth = 720;

function textFromTitle(title: unknown, fallback: string) {
  if (typeof title === 'string' || typeof title === 'number') return String(title);
  return fallback;
}

function dataIndexKey(dataIndex: unknown) {
  if (Array.isArray(dataIndex)) return dataIndex.join('.');
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') return String(dataIndex);
  return '';
}

function columnKey<T extends object>(column: ColumnsType<T>[number], index: number) {
  const keyed = column as { key?: React.Key; dataIndex?: unknown; title?: unknown };
  return String(keyed.key || dataIndexKey(keyed.dataIndex) || textFromTitle(keyed.title, `column_${index}`));
}

function columnTitle<T extends object>(column: ColumnsType<T>[number], fallback: string) {
  return textFromTitle((column as { title?: unknown }).title, fallback);
}

function normalizeWidth(value: unknown, fallback: number) {
  const width = Number(value);
  if (!Number.isFinite(width)) return fallback;
  return Math.min(Math.max(width, minColumnWidth), maxColumnWidth);
}

function normalizeOrder(value: unknown, defaultOrder: ColumnKey[]) {
  const valid = new Set(defaultOrder);
  const saved = Array.isArray(value) ? value.map(String).filter((key) => valid.has(key)) : [];
  return [...saved, ...defaultOrder.filter((key) => !saved.includes(key))];
}

function normalizeVisible(value: unknown, defaultVisible: ColumnKey[], defaultOrder: ColumnKey[]) {
  const valid = new Set(defaultOrder);
  const saved = Array.isArray(value) ? value.map(String).filter((key) => valid.has(key)) : defaultVisible;
  return saved.length ? saved : defaultVisible;
}

function normalizeWidths(value: unknown, definitions: ColumnDefinition<object>[]) {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return definitions.reduce<ColumnWidths>((widths, definition) => {
    widths[definition.key] = normalizeWidth(saved[definition.key], definition.defaultWidth);
    return widths;
  }, {});
}

function moveColumn(keys: ColumnKey[], key: ColumnKey, direction: -1 | 1) {
  const index = keys.indexOf(key);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= keys.length) return keys;
  const next = [...keys];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function canUseTextTooltip(value: unknown) {
  return value === null || value === undefined || typeof value === 'string' || typeof value === 'number';
}

export function tableCellTooltip(value: unknown) {
  const text = value === null || value === undefined || value === '' ? '-' : String(value);
  return (
    <Tooltip title={text}>
      <span className="table-cell-ellipsis">{text}</span>
    </Tooltip>
  );
}

function renderValueByDataIndex<T extends object>(row: T, dataIndex: unknown) {
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>((current, key) => (
      current && typeof current === 'object' ? (current as Record<string, unknown>)[String(key)] : undefined
    ), row);
  }
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') {
    return (row as Record<string, unknown>)[String(dataIndex)];
  }
  return undefined;
}

function withTextTooltip<T extends object>(column: ColumnsType<T>[number]) {
  if (textFromTitle((column as { title?: unknown }).title, '') === '操作') return column;
  const currentRender = column.render;
  const dataIndex = (column as { dataIndex?: unknown }).dataIndex;
  return {
    ...column,
    ellipsis: column.ellipsis ?? true,
    render: (value: unknown, record: T, index: number) => {
      const rendered = currentRender
        ? currentRender(value, record, index)
        : renderValueByDataIndex(record, dataIndex);
      if (isValidElement(rendered) || Array.isArray(rendered) || !canUseTextTooltip(rendered)) return rendered;
      return tableCellTooltip(rendered);
    },
  };
}

function readPreference(key: string, definitions: ColumnDefinition<object>[]): ColumnPreference {
  const defaultOrder = definitions.map((definition) => definition.key);
  const defaultVisible = definitions.filter((definition) => definition.defaultVisible).map((definition) => definition.key);
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}') as Partial<ColumnPreference>;
    return {
      order: normalizeOrder(saved.order, defaultOrder),
      visible: normalizeVisible(saved.visible, defaultVisible, defaultOrder),
      widths: normalizeWidths(saved.widths, definitions),
    };
  } catch {
    return {
      order: defaultOrder,
      visible: defaultVisible,
      widths: normalizeWidths({}, definitions),
    };
  }
}

export function useTableColumnSettings<T extends object>(
  tableKey: string,
  baseColumns: ColumnsType<T>,
  options?: { actionWidth?: number },
): ColumnSettings<T> {
  const definitions = useMemo(() => baseColumns.map((column, index) => {
    const key = columnKey(column, index);
    return {
      key,
      title: columnTitle(column, key),
      column,
      defaultVisible: true,
      defaultWidth: normalizeWidth(column.width, options?.actionWidth || 160),
    };
  }), [baseColumns, options?.actionWidth]);
  const storageKey = `ttw_table_columns_${tableKey}`;
  const [open, setOpen] = useState(false);
  const [preference, setPreference] = useState<ColumnPreference>(() => readPreference(storageKey, definitions as ColumnDefinition<object>[]));

  const savePreference = (next: ColumnPreference) => {
    setPreference(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const defaultOrder = definitions.map((definition) => definition.key);
  const defaultVisible = definitions.filter((definition) => definition.defaultVisible).map((definition) => definition.key);
  const orderedColumns = preference.order
    .filter((key) => preference.visible.includes(key))
    .map((key) => {
      const definition = definitions.find((item) => item.key === key);
      if (!definition) return undefined;
      return {
        ...withTextTooltip(definition.column),
        key: definition.key,
        width: preference.widths[definition.key] || definition.defaultWidth,
      };
    })
    .filter(Boolean) as ColumnsType<T>;

  const scrollX = orderedColumns.reduce((sum, column) => sum + (Number(column.width) || 160), 0);
  const resetPreference = () => savePreference({
    order: defaultOrder,
    visible: defaultVisible,
    widths: normalizeWidths({}, definitions as ColumnDefinition<object>[]),
  });

  const button = (
    <>
      <Button icon={<SettingOutlined />} onClick={() => setOpen(true)}>
        列设置
      </Button>
      <Modal
        title="自定义展示列"
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="reset" onClick={resetPreference}>恢复默认</Button>,
          <Button key="close" type="primary" onClick={() => setOpen(false)}>完成</Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {preference.order.map((key, index) => {
            const definition = definitions.find((item) => item.key === key);
            if (!definition) return null;
            const checked = preference.visible.includes(key);
            const onlyVisible = checked && preference.visible.length === 1;
            return (
              <Card key={key} size="small">
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Checkbox
                    checked={checked}
                    disabled={onlyVisible}
                    onChange={(event) => {
                      const visible = event.target.checked
                        ? [...preference.visible, key]
                        : preference.visible.filter((item) => item !== key);
                      savePreference({ ...preference, visible: normalizeVisible(visible, defaultVisible, defaultOrder) });
                    }}
                  >
                    {definition.title}
                  </Checkbox>
                  <Space>
                    <InputNumber
                      aria-label={`${definition.title}列宽`}
                      addonAfter="px"
                      min={minColumnWidth}
                      max={maxColumnWidth}
                      step={10}
                      value={preference.widths[key] || definition.defaultWidth}
                      onChange={(value) => savePreference({
                        ...preference,
                        widths: {
                          ...preference.widths,
                          [key]: normalizeWidth(value, definition.defaultWidth),
                        },
                      })}
                    />
                    <Button
                      aria-label={`${definition.title}上移`}
                      disabled={index === 0}
                      icon={<ArrowUpOutlined />}
                      onClick={() => savePreference({ ...preference, order: moveColumn(preference.order, key, -1) })}
                    />
                    <Button
                      aria-label={`${definition.title}下移`}
                      disabled={index === preference.order.length - 1}
                      icon={<ArrowDownOutlined />}
                      onClick={() => savePreference({ ...preference, order: moveColumn(preference.order, key, 1) })}
                    />
                  </Space>
                </Space>
              </Card>
            );
          })}
        </Space>
      </Modal>
    </>
  );

  return { columns: orderedColumns, scrollX, button };
}
